// Runs the decomp's Mario outside the game: the globals, memory and engine entry points his code expects, and the
// exported API src/mario/sim.js drives. The game systems Boogle has no use for (objects, sound, camera, saving, warps)
// are inert stubs in stubs.c.
#include <ultra64.h>
#include "sm64.h"
#include "types.h"
#include "game/area.h"
#include "game/camera.h"
#include "game/game_init.h"
#include "game/level_update.h"
#include "game/mario.h"
#include "game/mario_misc.h"
#include "game/memory.h"
#include "game/object_list_processor.h"
#include "game/interaction.h"
#include "game/save_file.h"
#include "engine/graph_node.h"
#include "engine/geo_layout.h"
#include "engine/math_util.h"
#include "engine/surface_collision.h"
#include "actors/group0.h"
#include "actors/group10.h"
#include "shim.h"

struct MarioState gMarioStates[1];
struct MarioState *gMarioState = &gMarioStates[0];
struct Object *gMarioObject;
struct Object *gCurrentObject;
struct Area *gCurrentArea;
struct SpawnInfo gPlayerSpawnInfos[1];
struct SpawnInfo *gMarioSpawnInfo = &gPlayerSpawnInfos[0];
struct Controller gControllers[3];
struct Controller *gPlayer1Controller = &gControllers[0];
struct Controller *gPlayer2Controller = &gControllers[1];
struct Controller *gPlayer3Controller = &gControllers[2];
struct PlayerCameraState gPlayerCameraState[2];
struct DmaHandlerList gMarioAnimsBuf;
struct HudDisplay gHudDisplay;
u32 gGlobalTimer;
u16 gAreaUpdateCounter;
s16 gCameraMovementFlags;
s16 gCurrLevelNum = 1;
s16 gCurrCourseNum;
s16 gCurrActNum = 1;
s16 gCurrAreaIndex = 1;
s16 gCurrSaveFileNum = 1;
s8 gNeverEnteredCastle;
u8 gSpecialTripleJump;
s8 gShowDebugText;
s32 gDebugInfoFlags;
s16 gDebugInfo[16][8];
struct Object *gCutsceneFocus;
struct Object *gSecondCameraFocus;

static struct Object sMarioObject;
static struct Area sArea;
static struct Camera sCamera;

// ---------------------------------------------------------------- memory

static u8 sPool[0x80000];
static u32 sPoolUsed;

static void *bump(u32 size) {
    void *p = &sPool[sPoolUsed];
    sPoolUsed += (size + 15) & ~15;
    return p;
}

struct AllocOnlyPool *alloc_only_pool_init(u32 size, UNUSED u32 side) {
    struct AllocOnlyPool *pool = bump(sizeof(struct AllocOnlyPool));
    pool->totalSpace = size;
    pool->usedSpace = 0;
    pool->startPtr = bump(size);
    pool->freePtr = pool->startPtr;
    return pool;
}

void *alloc_only_pool_alloc(struct AllocOnlyPool *pool, s32 size) {
    void *p = pool->freePtr;
    size = (size + 3) & ~3;
    pool->freePtr += size;
    pool->usedSpace += size;
    return p;
}

void *segmented_to_virtual(const void *addr) {
    return (void *) addr;
}

void *virtual_to_segmented(UNUSED u32 segment, const void *addr) {
    return (void *) addr;
}

void *memcpy(void *dst, const void *src, size_t n) {
    u8 *d = dst;
    const u8 *s = src;
    while (n--) {
        *d++ = *s++;
    }
    return dst;
}

void *memset(void *dst, int c, size_t n) {
    u8 *d = dst;
    while (n--) {
        *d++ = c;
    }
    return dst;
}

void bzero(void *dst, size_t n) {
    memset(dst, 0, n);
}

void bcopy(const void *src, void *dst, size_t n) {
    memcpy(dst, src, n);
}

float sqrtf(float x) {
    return __builtin_sqrtf(x);
}

// ---------------------------------------------------------------- animations

// The ROM's Mario animation bank (src/mario/rom.js copies it here): a DmaTable of big-endian offsets and sizes,
// then each animation's header and s16 data, also big-endian.
static u8 sAnimBank[0xA0000];
static u8 sAnimTarget[0x4000];

static u16 be16(const u8 *p) {
    return (p[0] << 8) | p[1];
}

static u32 be32(const u8 *p) {
    return ((u32) p[0] << 24) | ((u32) p[1] << 16) | ((u32) p[2] << 8) | p[3];
}

// Byte-swaps one animation into little-endian `struct Animation` followed by its s16 data.
s32 load_patchable_table(struct DmaHandlerList *list, s32 index) {
    u32 count = be32(sAnimBank);
    if ((u32) index >= count) {
        return FALSE;
    }
    u32 offset = be32(sAnimBank + 8 + index * 8);
    u32 size = be32(sAnimBank + 12 + index * 8);
    u8 *src = sAnimBank + offset;
    if (src == list->currentAddr || size > sizeof(sAnimTarget)) {
        return FALSE;
    }
    struct Animation *anim = list->bufTarget;
    anim->flags = be16(src + 0x00);
    anim->animYTransDivisor = be16(src + 0x02);
    anim->startFrame = be16(src + 0x04);
    anim->loopStart = be16(src + 0x06);
    anim->loopEnd = be16(src + 0x08);
    anim->unusedBoneCount = be16(src + 0x0A);
    anim->values = (void *) (uintptr_t) be32(src + 0x0C);
    anim->index = (void *) (uintptr_t) be32(src + 0x10);
    anim->length = be32(src + 0x14);
    u16 *data = (u16 *) ((u8 *) anim + sizeof(struct Animation));
    for (u32 i = sizeof(struct Animation); i + 1 < size; i += 2) {
        *data++ = be16(src + i);
    }
    list->currentAddr = src;
    return TRUE;
}

// ---------------------------------------------------------------- Mario's object

void copy_mario_state_to_object(void) {
    struct Object *o = gMarioObject;
    struct MarioState *m = gMarioState;

    o->oVelX = m->vel[0];
    o->oVelY = m->vel[1];
    o->oVelZ = m->vel[2];
    o->oPosX = m->pos[0];
    o->oPosY = m->pos[1];
    o->oPosZ = m->pos[2];
    o->oMoveAnglePitch = o->header.gfx.angle[0];
    o->oMoveAngleYaw = o->header.gfx.angle[1];
    o->oMoveAngleRoll = o->header.gfx.angle[2];
    o->oFaceAnglePitch = o->header.gfx.angle[0];
    o->oFaceAngleYaw = o->header.gfx.angle[1];
    o->oFaceAngleRoll = o->header.gfx.angle[2];
    o->oAngleVelPitch = m->angleVel[0];
    o->oAngleVelYaw = m->angleVel[1];
    o->oAngleVelRoll = m->angleVel[2];
}

static struct GraphNode *sMarioGraph;

static void init_mario_object(void) {
    struct AllocOnlyPool *pool = alloc_only_pool_init(0x20000, 0);
    sMarioGraph = process_geo_layout(pool, (void *) mario_geo);

    gMarioObject = &sMarioObject;
    gCurrentObject = gMarioObject;
    init_graph_node_object(NULL, &sMarioObject.header.gfx, sMarioGraph, gVec3fZero, gVec3sZero, gVec3fOne);
    sMarioObject.header.gfx.node.flags |= GRAPH_RENDER_ACTIVE | GRAPH_RENDER_HAS_ANIMATION;
    sMarioObject.hitboxRadius = 37.0f;
    sMarioObject.hitboxHeight = 160.0f;

    sArea.index = 1;
    sArea.camera = &sCamera;
    gCurrentArea = &sArea;
}

// ---------------------------------------------------------------- API (src/mario/sim.js)

static struct ShimState sState;

EXPORT u8 *sm64_anim_bank(void) {
    return sAnimBank;
}

EXPORT u32 sm64_anim_bank_size(void) {
    return sizeof(sAnimBank);
}

EXPORT struct ShimState *sm64_state(void) {
    return &sState;
}

EXPORT void sm64_init(void) {
    init_mario_object();
    gMarioAnimsBuf.dmaTable = (void *) sAnimBank;
    gMarioAnimsBuf.bufTarget = sAnimTarget;
}

EXPORT void sm64_spawn(f32 x, f32 y, f32 z, s16 yaw) {
    vec3s_set(gMarioSpawnInfo->startPos, x, y, z);
    vec3s_set(gMarioSpawnInfo->startAngle, 0, yaw, 0);
    gMarioAnimsBuf.currentAddr = NULL;
    init_mario_from_save_file();
    gMarioState->health = 0x880;
    init_mario();
    gMarioState->pos[0] = x;
    gMarioState->pos[2] = z;
    set_mario_action(gMarioState, ACT_SPAWN_SPIN_AIRBORNE, 0);
    copy_mario_state_to_object();
}

// Stick in [-64, 64] (x right, y away from the camera), camYaw the SM64 yaw from Mario to the camera.
EXPORT void sm64_input(f32 stickX, f32 stickY, u32 buttons, s16 camYaw) {
    struct Controller *c = gPlayer1Controller;
    f32 mag = sqrtf(stickX * stickX + stickY * stickY);
    if (mag > 64.0f) {
        stickX *= 64.0f / mag;
        stickY *= 64.0f / mag;
        mag = 64.0f;
    }
    c->stickX = stickX;
    c->stickY = stickY;
    c->stickMag = mag;
    c->buttonPressed = buttons & ~c->buttonDown;
    c->buttonDown = buttons;
    sCamera.yaw = camYaw;
}

// Moves Mario by whole units when src/mario/sim.js recentres the local frame his collision lives in.
EXPORT void sm64_shift(f32 dx, f32 dz) {
    struct MarioState *m = gMarioState;
    m->pos[0] += dx;
    m->pos[2] += dz;
    gMarioObject->header.gfx.pos[0] += dx;
    gMarioObject->header.gfx.pos[2] += dz;
    copy_mario_state_to_object();
}

EXPORT void sm64_teleport(f32 x, f32 y, f32 z) {
    struct MarioState *m = gMarioState;
    vec3f_set(m->pos, x, y, z);
    vec3f_set(m->vel, 0, 0, 0);
    m->forwardVel = 0;
    m->peakHeight = y;
    vec3f_copy(gMarioObject->header.gfx.pos, m->pos);
    set_mario_action(m, ACT_FREEFALL, 0);
    copy_mario_state_to_object();
}

static void read_pose(struct ShimPose *p) {
    struct GraphNodeObject *gfx = &gMarioObject->header.gfx;
    struct MarioBodyState *b = &gBodyStates[0];

    p->animID = gfx->animInfo.animID;
    p->animFrame = gfx->animInfo.animFrame;
    for (s32 i = 0; i < 3; i++) {
        p->angle[i] = gfx->angle[i];
        p->torsoAngle[i] = b->torsoAngle[i];
        p->headAngle[i] = b->headAngle[i];
        p->offset[i] = gfx->pos[i] - gMarioState->pos[i];
        p->scale[i] = gfx->scale[i];
    }
    p->action = b->action;
    p->capState = b->capState;
    p->eyeState = b->eyeState;
    p->handState = b->handState;
    p->punchState = b->punchState;
    p->modelState = b->modelState;
    p->wingFlutter = b->wingFlutter;
}

static struct Object sPosed;
static u8 sPosedAnim[0x4000];
static struct DmaHandlerList sPosedAnims;
static struct ShimPose sPoseIn;

EXPORT struct ShimPose *sm64_pose_buffer(void) {
    return &sPoseIn;
}

// Draws the pose in sm64_pose_buffer() (another player's Mario) into the vertex buffer, relative to his position. The
// geo callbacks read gBodyStates[0], so this player's body state is set aside while they run.
EXPORT void sm64_render_pose(void) {
    struct ShimPose *p = &sPoseIn;
    struct GraphNodeObject *gfx = &sPosed.header.gfx;
    struct MarioBodyState saved = gBodyStates[0];
    struct MarioBodyState *b = &gBodyStates[0];

    if (gfx->sharedChild == NULL) {
        init_graph_node_object(NULL, gfx, sMarioGraph, gVec3fZero, gVec3sZero, gVec3fOne);
        gfx->node.flags |= GRAPH_RENDER_ACTIVE;
        sPosedAnims.dmaTable = (void *) sAnimBank;
        sPosedAnims.bufTarget = sPosedAnim;
    }
    struct Animation *anim = sPosedAnims.bufTarget;
    if (load_patchable_table(&sPosedAnims, p->animID)) {
        anim->values = (void *) ((u8 *) anim + (uintptr_t) anim->values);
        anim->index = (void *) ((u8 *) anim + (uintptr_t) anim->index);
    }
    gfx->animInfo.animID = p->animID;
    gfx->animInfo.curAnim = anim;
    gfx->animInfo.animFrame = p->animFrame;
    gfx->animInfo.animYTrans = 0xBD;
    gfx->animInfo.animAccel = 0;
    for (s32 i = 0; i < 3; i++) {
        gfx->angle[i] = p->angle[i];
        gfx->pos[i] = p->offset[i];
        gfx->scale[i] = p->scale[i];
        b->torsoAngle[i] = p->torsoAngle[i];
        b->headAngle[i] = p->headAngle[i];
    }
    b->action = p->action;
    b->capState = p->capState;
    b->eyeState = p->eyeState;
    b->handState = p->handState;
    b->punchState = p->punchState;
    b->modelState = p->modelState;
    b->wingFlutter = p->wingFlutter;
    shim_render_object(gfx, gVec3fZero, FALSE);
    gBodyStates[0] = saved;
}

static struct Object sYoshi;

EXPORT s32 sm64_yoshi_anim_length(s32 anim) {
    return yoshi_seg5_anims_05024100[anim]->loopEnd;
}

// Draws Yoshi (animation 0 idle, 1 walk, 2 jump) into the vertex buffer, at his feet, facing +z.
EXPORT void sm64_render_yoshi(s32 anim, s32 frame, s32 blink) {
    struct GraphNodeObject *gfx = &sYoshi.header.gfx;

    if (gfx->sharedChild == NULL) {
        struct AllocOnlyPool *pool = alloc_only_pool_init(0x4000, 0);
        init_graph_node_object(NULL, gfx, process_geo_layout(pool, (void *) yoshi_geo), gVec3fZero, gVec3sZero,
                               gVec3fOne);
        gfx->node.flags |= GRAPH_RENDER_ACTIVE;
    }
    gfx->animInfo.animID = anim;
    gfx->animInfo.curAnim = (struct Animation *) yoshi_seg5_anims_05024100[anim];
    gfx->animInfo.animFrame = frame;
    gfx->animInfo.animAccel = 0;
    sYoshi.oAnimState = blink;
    shim_render_object(gfx, gVec3fZero, FALSE);
}

EXPORT void sm64_tick(void) {
    struct MarioState *m = gMarioState;
    gCurrentObject = gMarioObject;
    gMarioObject->oMarioParticleFlags = execute_mario_action(gMarioObject);
    copy_mario_state_to_object();
    // Mario never runs out of health or air in Boogle.
    m->health = 0x880;
    m->hurtCounter = 0;
    shim_render_object(&gMarioObject->header.gfx, m->pos, TRUE);
    gAreaUpdateCounter++;
    gGlobalTimer++;

    sState.pos[0] = m->pos[0];
    sState.pos[1] = m->pos[1];
    sState.pos[2] = m->pos[2];
    sState.vel[0] = m->vel[0];
    sState.vel[1] = m->vel[1];
    sState.vel[2] = m->vel[2];
    sState.forwardVel = m->forwardVel;
    sState.faceYaw = m->faceAngle[1];
    sState.action = m->action;
    sState.floorHeight = m->floorHeight;
    sState.particleFlags = gMarioObject->oMarioParticleFlags;
    sState.flags = m->flags;
    read_pose(&sState.pose);
}
