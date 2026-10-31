#ifndef BOOGLE_SHIM_H
#define BOOGLE_SHIM_H

#include <ultra64.h>
#include "types.h"

#define EXPORT __attribute__((used, visibility("default")))

// One output vertex: position (engine units, relative to the drawn object's origin), normal, colour 0-1, texture
// coordinates in the texture's own 0-1 square, texture index (-1 for none), and how the texture combines (render.c).
#define VERT_FLOATS 13

// How one guest looks this frame: guest_tick reports this player's, guest_render_pose draws another player's. Every field
// is 4 bytes so src/guest/engine.js can read it as one Int32Array/Float32Array; keep the order in step with it.
struct ShimPose {
    s32 animID;
    s32 animFrame;
    s32 angle[3];
    s32 action;
    s32 capState;
    s32 eyeState;
    s32 handState;
    s32 punchState;
    s32 modelState;
    s32 wingFlutter;
    s32 torsoAngle[3];
    s32 headAngle[3];
    f32 offset[3];
    f32 scale[3];
};

// What src/guest/engine.js reads after each tick; keep the field order in step with it.
struct ShimState {
    f32 pos[3];
    f32 vel[3];
    f32 forwardVel;
    f32 floorHeight;
    s32 faceYaw;
    u32 action;
    u32 particleFlags;
    u32 flags;
    struct ShimPose pose;
};

void shim_render_object(struct GraphNodeObject *obj, Vec3f origin, s32 advanceAnimation);
void copy_mario_state_to_object(void);

#endif
