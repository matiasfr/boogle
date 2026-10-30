// Draws Mario: walks his graph nodes the way the decomp's rendering_graph_node.c draws one object, with float
// matrices, and turns each Fast3D display list straight into a flat triangle list for src/mario/model.js.
#include <ultra64.h>
#include "sm64.h"
#include "types.h"
#include "game/camera.h"
#include "game/level_update.h"
#include "game/mario_misc.h"
#include "game/rendering_graph_node.h"
#include "engine/graph_node.h"
#include "engine/math_util.h"
#include "shim.h"

#define MAX_VERTS (2048 * 3)

struct GraphNodeRoot *gCurGraphNodeRoot;
struct GraphNodeMasterList *gCurGraphNodeMasterList;
struct GraphNodePerspective *gCurGraphNodeCamFrustum;
struct GraphNodeCamera *gCurGraphNodeCamera;
struct GraphNodeObject *gCurGraphNodeObject;
struct GraphNodeHeldObject *gCurGraphNodeHeldObject;

static f32 sVerts[MAX_VERTS * VERT_FLOATS];
static s32 sVertCount;

static Mat4 sMatStack[32];
static s16 sMatStackIndex;
static Mat4 sIdentity;
static struct Camera sRenderCamera;
static struct GraphNodeCamera sCameraNode;

static u8 sCurrAnimType;
static s16 sCurrAnimFrame;
static f32 sCurrAnimTranslationMultiplier;
static u16 *sCurrAnimAttribute;
static s16 *sCurrAnimData;

static u8 sGfxPool[0x4000];
static u32 sGfxPoolUsed;

void *alloc_display_list(u32 size) {
    void *p = &sGfxPool[sGfxPoolUsed];
    sGfxPoolUsed += ((size + 7) & ~7);
    return p;
}

// ---------------------------------------------------------------- Fast3D

struct RspVertex {
    f32 pos[3];
    f32 normal[3];
    f32 color[3];
    f32 st[2];
};

static struct {
    struct RspVertex verts[16];
    u32 geometryMode;
    u8 diffuse[3];
    s32 textureOn;
    f32 scaleS, scaleT;
    s32 texture;
    f32 width, height;
    s32 mix;
} sRsp;

enum { MIX_SHADE, MIX_BLEND, MIX_DECAL, MIX_MODULATE };

static const Gfx sCombiners[] = {
    gsDPSetCombineMode(G_CC_BLENDRGBA, G_CC_BLENDRGBA),
    gsDPSetCombineMode(G_CC_BLENDRGBFADEA, G_CC_BLENDRGBFADEA),
    gsDPSetCombineMode(G_CC_DECALRGBA, G_CC_DECALRGBA),
    gsDPSetCombineMode(G_CC_DECALFADE, G_CC_DECALFADE),
    gsDPSetCombineMode(G_CC_DECALFADEA, G_CC_DECALFADEA),
    gsDPSetCombineMode(G_CC_MODULATERGB, G_CC_MODULATERGB),
    gsDPSetCombineMode(G_CC_MODULATERGBA, G_CC_MODULATERGBA),
    gsDPSetCombineMode(G_CC_MODULATERGBFADEA, G_CC_MODULATERGBFADEA),
};
static const s32 sCombinerMix[] = {
    MIX_BLEND, MIX_BLEND, MIX_DECAL, MIX_DECAL, MIX_DECAL, MIX_MODULATE, MIX_MODULATE, MIX_MODULATE,
};

static void load_vertices(const Vtx *v, s32 count, s32 dest, Mat4 m) {
    for (s32 i = 0; i < count && dest + i < 16; i++) {
        struct RspVertex *r = &sRsp.verts[dest + i];
        f32 x = v[i].v.ob[0], y = v[i].v.ob[1], z = v[i].v.ob[2];
        r->pos[0] = x * m[0][0] + y * m[1][0] + z * m[2][0] + m[3][0];
        r->pos[1] = x * m[0][1] + y * m[1][1] + z * m[2][1] + m[3][1];
        r->pos[2] = x * m[0][2] + y * m[1][2] + z * m[2][2] + m[3][2];
        if (sRsp.geometryMode & G_LIGHTING) {
            f32 nx = v[i].n.n[0], ny = v[i].n.n[1], nz = v[i].n.n[2];
            f32 tx = nx * m[0][0] + ny * m[1][0] + nz * m[2][0];
            f32 ty = nx * m[0][1] + ny * m[1][1] + nz * m[2][1];
            f32 tz = nx * m[0][2] + ny * m[1][2] + nz * m[2][2];
            f32 len = sqrtf(tx * tx + ty * ty + tz * tz);
            if (len > 0.0f) {
                tx /= len;
                ty /= len;
                tz /= len;
            }
            r->normal[0] = tx;
            r->normal[1] = ty;
            r->normal[2] = tz;
            for (s32 k = 0; k < 3; k++) {
                r->color[k] = sRsp.diffuse[k] / 255.0f;
            }
        } else {
            r->normal[0] = 0.0f;
            r->normal[1] = 1.0f;
            r->normal[2] = 0.0f;
            for (s32 k = 0; k < 3; k++) {
                r->color[k] = v[i].v.cn[k] / 255.0f;
            }
        }
        r->st[0] = v[i].v.tc[0] / 32.0f * sRsp.scaleS;
        r->st[1] = v[i].v.tc[1] / 32.0f * sRsp.scaleT;
    }
}

static void emit_vertex(const struct RspVertex *r) {
    if (sVertCount >= MAX_VERTS) {
        return;
    }
    f32 *o = &sVerts[sVertCount++ * VERT_FLOATS];
    s32 textured = sRsp.textureOn && sRsp.texture >= 0 && sRsp.mix != MIX_SHADE
                   && !(sRsp.geometryMode & G_TEXTURE_GEN);
    o[0] = r->pos[0];
    o[1] = r->pos[1];
    o[2] = r->pos[2];
    o[3] = r->normal[0];
    o[4] = r->normal[1];
    o[5] = r->normal[2];
    o[6] = r->color[0];
    o[7] = r->color[1];
    o[8] = r->color[2];
    o[9] = textured ? r->st[0] / sRsp.width : 0.0f;
    o[10] = textured ? r->st[1] / sRsp.height : 0.0f;
    o[11] = textured ? sRsp.texture : -1.0f;
    o[12] = textured ? sRsp.mix : MIX_SHADE;
}

static void run_display_list(const Gfx *dl, Mat4 m) {
    for (;; dl++) {
        u32 w0 = dl->words.w0;
        u32 w1 = dl->words.w1;
        switch ((u8) (w0 >> 24)) {
            case (u8) G_VTX:
                load_vertices((const Vtx *) (uintptr_t) w1, ((w0 >> 20) & 0xF) + 1, (w0 >> 16) & 0xF, m);
                break;
            case (u8) G_TRI1:
                emit_vertex(&sRsp.verts[((w1 >> 16) & 0xFF) / 10]);
                emit_vertex(&sRsp.verts[((w1 >> 8) & 0xFF) / 10]);
                emit_vertex(&sRsp.verts[(w1 & 0xFF) / 10]);
                break;
            case (u8) G_DL:
                if (((w0 >> 16) & 0xFF) == G_DL_NOPUSH) {
                    dl = (const Gfx *) (uintptr_t) w1 - 1;
                } else {
                    run_display_list((const Gfx *) (uintptr_t) w1, m);
                }
                break;
            case (u8) G_ENDDL:
                return;
            case (u8) G_MOVEMEM:
                if (((w0 >> 16) & 0xFF) == G_MV_L0) {
                    const Light *light = (const Light *) (uintptr_t) w1;
                    sRsp.diffuse[0] = light->l.col[0];
                    sRsp.diffuse[1] = light->l.col[1];
                    sRsp.diffuse[2] = light->l.col[2];
                }
                break;
            case (u8) G_SETGEOMETRYMODE:
                sRsp.geometryMode |= w1;
                break;
            case (u8) G_CLEARGEOMETRYMODE:
                sRsp.geometryMode &= ~w1;
                break;
            case (u8) G_TEXTURE:
                sRsp.textureOn = (w0 & 0xFF) != 0;
                sRsp.scaleS = (w1 >> 16) / 65536.0f;
                sRsp.scaleT = (w1 & 0xFFFF) / 65536.0f;
                break;
            case (u8) G_SETTIMG:
                sRsp.texture = *(const u8 *) (uintptr_t) w1;
                break;
            case (u8) G_SETTILESIZE:
                if (((w1 >> 24) & 7) == G_TX_RENDERTILE) {
                    sRsp.width = ((((w1 >> 12) & 0xFFF) - ((w0 >> 12) & 0xFFF)) >> 2) + 1;
                    sRsp.height = (((w1 & 0xFFF) - (w0 & 0xFFF)) >> 2) + 1;
                }
                break;
            case (u8) G_SETCOMBINE:
                sRsp.mix = MIX_SHADE;
                for (u32 i = 0; i < ARRAY_COUNT(sCombiners); i++) {
                    if (sCombiners[i].words.w0 == w0 && sCombiners[i].words.w1 == w1) {
                        sRsp.mix = sCombinerMix[i];
                    }
                }
                break;
        }
    }
}

// ---------------------------------------------------------------- graph nodes

static void process_siblings(struct GraphNode *first);

static void push(Mat4 local) {
    mtxf_mul(sMatStack[sMatStackIndex + 1], local, sMatStack[sMatStackIndex]);
    sMatStackIndex++;
}

static void draw_and_descend(struct GraphNode *node, void *displayList) {
    if (displayList != NULL) {
        run_display_list(displayList, sMatStack[sMatStackIndex]);
    }
    if (node->children != NULL) {
        process_siblings(node->children);
    }
}

static void set_animation_globals(struct AnimInfo *node, s32 hasAnimation) {
    struct Animation *anim = node->curAnim;

    if (hasAnimation) {
        node->animFrame = geo_update_animation_frame(node, &node->animFrameAccelAssist);
    }
    node->animTimer = gAreaUpdateCounter;
    if (anim->flags & ANIM_FLAG_HOR_TRANS) {
        sCurrAnimType = ANIM_TYPE_VERTICAL_TRANSLATION;
    } else if (anim->flags & ANIM_FLAG_VERT_TRANS) {
        sCurrAnimType = ANIM_TYPE_LATERAL_TRANSLATION;
    } else if (anim->flags & ANIM_FLAG_6) {
        sCurrAnimType = ANIM_TYPE_NO_TRANSLATION;
    } else {
        sCurrAnimType = ANIM_TYPE_TRANSLATION;
    }
    sCurrAnimFrame = node->animFrame;
    sCurrAnimAttribute = (u16 *) anim->index;
    sCurrAnimData = (s16 *) anim->values;
    if (anim->animYTransDivisor == 0) {
        sCurrAnimTranslationMultiplier = 1.0f;
    } else {
        sCurrAnimTranslationMultiplier = (f32) node->animYTrans / (f32) anim->animYTransDivisor;
    }
}

static f32 next_anim_value(void) {
    return sCurrAnimData[retrieve_animation_index(sCurrAnimFrame, &sCurrAnimAttribute)];
}

static void process_animated_part(struct GraphNodeAnimatedPart *node) {
    Mat4 matrix;
    Vec3s rotation = { 0, 0, 0 };
    Vec3f translation = { node->translation[0], node->translation[1], node->translation[2] };
    f32 k = sCurrAnimTranslationMultiplier;

    if (sCurrAnimType == ANIM_TYPE_TRANSLATION) {
        translation[0] += next_anim_value() * k;
        translation[1] += next_anim_value() * k;
        translation[2] += next_anim_value() * k;
        sCurrAnimType = ANIM_TYPE_ROTATION;
    } else if (sCurrAnimType == ANIM_TYPE_LATERAL_TRANSLATION) {
        translation[0] += next_anim_value() * k;
        sCurrAnimAttribute += 2;
        translation[2] += next_anim_value() * k;
        sCurrAnimType = ANIM_TYPE_ROTATION;
    } else if (sCurrAnimType == ANIM_TYPE_VERTICAL_TRANSLATION) {
        sCurrAnimAttribute += 2;
        translation[1] += next_anim_value() * k;
        sCurrAnimAttribute += 2;
        sCurrAnimType = ANIM_TYPE_ROTATION;
    } else if (sCurrAnimType == ANIM_TYPE_NO_TRANSLATION) {
        sCurrAnimAttribute += 6;
        sCurrAnimType = ANIM_TYPE_ROTATION;
    }
    if (sCurrAnimType == ANIM_TYPE_ROTATION) {
        rotation[0] = next_anim_value();
        rotation[1] = next_anim_value();
        rotation[2] = next_anim_value();
    }
    mtxf_rotate_xyz_and_translate(matrix, translation, rotation);
    push(matrix);
    draw_and_descend(&node->node, node->displayList);
    sMatStackIndex--;
}

static void process_node(struct GraphNode *node) {
    Mat4 m;
    Vec3f v;

    switch (node->type) {
        case GRAPH_NODE_TYPE_LEVEL_OF_DETAIL: {
            struct GraphNodeLevelOfDetail *lod = (struct GraphNodeLevelOfDetail *) node;
            if (lod->minDistance <= 0 && 0 < lod->maxDistance && node->children != NULL) {
                process_siblings(node->children);
            }
            break;
        }
        case GRAPH_NODE_TYPE_SWITCH_CASE: {
            struct GraphNodeSwitchCase *sw = (struct GraphNodeSwitchCase *) node;
            struct GraphNode *child = node->children;
            if (sw->fnNode.func != NULL) {
                sw->fnNode.func(GEO_CONTEXT_RENDER, node, sMatStack[sMatStackIndex]);
            }
            for (s32 i = 0; child != NULL && sw->selectedCase > i; i++) {
                child = child->next;
            }
            if (child != NULL) {
                process_siblings(child);
            }
            break;
        }
        case GRAPH_NODE_TYPE_TRANSLATION_ROTATION: {
            struct GraphNodeTranslationRotation *tr = (struct GraphNodeTranslationRotation *) node;
            vec3s_to_vec3f(v, tr->translation);
            mtxf_rotate_zxy_and_translate(m, v, tr->rotation);
            push(m);
            draw_and_descend(node, tr->displayList);
            sMatStackIndex--;
            break;
        }
        case GRAPH_NODE_TYPE_TRANSLATION: {
            struct GraphNodeTranslation *t = (struct GraphNodeTranslation *) node;
            vec3s_to_vec3f(v, t->translation);
            mtxf_rotate_zxy_and_translate(m, v, gVec3sZero);
            push(m);
            draw_and_descend(node, t->displayList);
            sMatStackIndex--;
            break;
        }
        case GRAPH_NODE_TYPE_ROTATION: {
            struct GraphNodeRotation *r = (struct GraphNodeRotation *) node;
            mtxf_rotate_zxy_and_translate(m, gVec3fZero, r->rotation);
            push(m);
            draw_and_descend(node, r->displayList);
            sMatStackIndex--;
            break;
        }
        case GRAPH_NODE_TYPE_SCALE: {
            struct GraphNodeScale *s = (struct GraphNodeScale *) node;
            vec3f_set(v, s->scale, s->scale, s->scale);
            mtxf_scale_vec3f(sMatStack[sMatStackIndex + 1], sMatStack[sMatStackIndex], v);
            sMatStackIndex++;
            draw_and_descend(node, s->displayList);
            sMatStackIndex--;
            break;
        }
        case GRAPH_NODE_TYPE_ANIMATED_PART:
            process_animated_part((struct GraphNodeAnimatedPart *) node);
            break;
        case GRAPH_NODE_TYPE_DISPLAY_LIST:
            draw_and_descend(node, ((struct GraphNodeDisplayList *) node)->displayList);
            break;
        case GRAPH_NODE_TYPE_GENERATED_LIST: {
            struct GraphNodeGenerated *g = (struct GraphNodeGenerated *) node;
            Gfx *list = NULL;
            if (g->fnNode.func != NULL) {
                list = g->fnNode.func(GEO_CONTEXT_RENDER, node, (void *) sMatStack[sMatStackIndex]);
            }
            draw_and_descend(node, list);
            break;
        }
        case GRAPH_NODE_TYPE_HELD_OBJ:
            break;
        default:
            if (node->children != NULL) {
                process_siblings(node->children);
            }
            break;
    }
}

static void process_siblings(struct GraphNode *first) {
    struct GraphNode *node = first;
    s32 iterate = first->parent == NULL || first->parent->type != GRAPH_NODE_TYPE_SWITCH_CASE;

    do {
        if (node->flags & GRAPH_RENDER_ACTIVE) {
            if (node->flags & GRAPH_RENDER_CHILDREN_FIRST) {
                if (node->children != NULL) {
                    process_siblings(node->children);
                }
            } else {
                process_node(node);
            }
        }
    } while (iterate && (node = node->next) != first);
}

// Draws `obj` relative to `origin`, so the vertices stay small and src/mario/model.js places the mesh.
void shim_render_object(struct GraphNodeObject *obj, Vec3f origin, s32 advanceAnimation) {
    Mat4 m;
    Vec3f pos;

    sVertCount = 0;
    sGfxPoolUsed = 0;
    if (obj->node.flags & GRAPH_RENDER_INVISIBLE) {
        return;
    }
    mtxf_identity(sIdentity);
    sRenderCamera.mode = CAMERA_MODE_NONE;
    sCameraNode.config.camera = &sRenderCamera;
    sCameraNode.matrixPtr = &sIdentity;
    gCurGraphNodeCamera = &sCameraNode;
    sRsp.texture = -1;
    sRsp.geometryMode = G_LIGHTING;
    sRsp.mix = MIX_SHADE;

    vec3f_set(pos, obj->pos[0] - origin[0], obj->pos[1] - origin[1], obj->pos[2] - origin[2]);
    mtxf_identity(sMatStack[0]);
    mtxf_rotate_zxy_and_translate(m, pos, obj->angle);
    mtxf_scale_vec3f(sMatStack[1], m, obj->scale);
    sMatStackIndex = 1;
    if (obj->animInfo.curAnim != NULL) {
        set_animation_globals(&obj->animInfo, advanceAnimation);
    }
    if (obj->sharedChild != NULL) {
        gCurGraphNodeObject = obj;
        obj->sharedChild->parent = &obj->node;
        process_siblings(obj->sharedChild);
        obj->sharedChild->parent = NULL;
        gCurGraphNodeObject = NULL;
    }
    sCurrAnimType = ANIM_TYPE_NONE;
}

EXPORT f32 *sm64_vertex_buffer(void) {
    return sVerts;
}

EXPORT s32 sm64_vertex_count(void) {
    return sVertCount;
}
