// The game systems the character code calls into that Boogle does not run: music, dialog, saving, warps, the camera, and
// the object system. Each is inert; spawn_object hands back a scratch object so callers can set its fields. Sounds are
// queued for src/guest/engine.js instead of played.
#include <ultra64.h>
#include "sm64.h"
#include "types.h"
#include "audio/external.h"
#include "game/area.h"
#include "game/behavior_actions.h"
#include "game/camera.h"
#include "game/ingame_menu.h"
#include "game/level_update.h"
#include "game/obj_behaviors.h"
#include "game/object_helpers.h"
#include "game/print.h"
#include "game/save_file.h"
#include "game/sound_init.h"
#include "game/object_list_processor.h"
#include "game/paintings.h"
#include "dialog_ids.h"
#include "engine/math_util.h"
#include "game/rendering_graph_node.h"
#include "shim.h"

#define MAX_SOUNDS 16

static struct Object sScratchObject;
static u32 sSounds[MAX_SOUNDS];
static s32 sSoundCount;

EXPORT u32 *guest_sounds(void) {
    return sSounds;
}

EXPORT s32 guest_take_sound_count(void) {
    s32 n = sSoundCount;
    sSoundCount = 0;
    return n;
}

void play_sound(s32 soundBits, UNUSED f32 *pos) {
    if (sSoundCount < MAX_SOUNDS) {
        sSounds[sSoundCount++] = soundBits;
    }
}

struct Object *spawn_object(UNUSED struct Object *parent, UNUSED s32 model, UNUSED const BehaviorScript *behavior) {
    bzero(&sScratchObject, sizeof(sScratchObject));
    return &sScratchObject;
}

struct Object *spawn_object_abs_with_rot(struct Object *parent, UNUSED s16 uselessArg, u32 model,
                                         const BehaviorScript *behavior, UNUSED s16 x, UNUSED s16 y, UNUSED s16 z,
                                         UNUSED s16 rx, UNUSED s16 ry, UNUSED s16 rz) {
    return spawn_object(parent, model, behavior);
}

f32 camera_approach_f32_symmetric(f32 current, f32 target, f32 increment) {
    f32 dist = target - current;

    if (increment < 0) {
        increment = -increment;
    }
    if (dist > 0) {
        dist -= increment;
        current = dist > 0 ? target - dist : target;
    } else {
        dist += increment;
        current = dist < 0 ? target - dist : target;
    }
    return current;
}

// The dino's blink: his object's oAnimState picks the open or closed eyes.
Gfx *geo_switch_anim_state(s32 callContext, struct GraphNode *node, UNUSED void *context) {
    if (callContext == GEO_CONTEXT_RENDER) {
        struct Object *obj = (struct Object *) gCurGraphNodeObject;
        struct GraphNodeSwitchCase *switchCase = (struct GraphNodeSwitchCase *) node;
        switchCase->selectedCase = obj->oAnimState < switchCase->numCases ? obj->oAnimState : 0;
    }
    return NULL;
}

Gfx *geo_move_mario_part_from_parent(UNUSED s32 run, UNUSED struct GraphNode *node, UNUSED Mat4 mtx) {
    return NULL;
}

s16 level_trigger_warp(UNUSED struct MarioState *m, UNUSED s32 warpOp) {
    return 0;
}

u32 save_file_get_flags(void) {
    return 0;
}

s32 save_file_get_total_star_count(UNUSED s32 fileIndex, UNUSED s32 minCourse, UNUSED s32 maxCourse) {
    return 0;
}

s32 save_file_get_cap_pos(UNUSED Vec3s capPos) {
    return FALSE;
}

s16 get_dialog_id(void) {
    return DIALOG_NONE;
}

u16 level_control_timer(UNUSED s32 timerOp) {
    return 0;
}

s32 trigger_cutscene_dialog(UNUSED s32 trigger) {
    return 0;
}

void bhv_spawn_star_no_level_exit(UNUSED u32 params) {}
void create_dialog_box(UNUSED s16 dialog) {}
void create_dialog_box_with_response(UNUSED s16 dialog) {}
void create_dialog_box_with_var(UNUSED s16 dialog, UNUSED s32 dialogVar) {}
void create_dialog_inverted_box(UNUSED s16 dialog) {}
void disable_background_sound(void) {}
void enable_background_sound(void) {}
void disable_time_stop(void) {}
void enable_time_stop(void) {}
void drop_queued_background_music(void) {}
void fade_into_special_warp(UNUSED u32 arg, UNUSED u32 color) {}
void fadeout_cap_music(void) {}
void fadeout_level_music(UNUSED s16 fadeTimer) {}
void load_level_init_text(UNUSED u32 arg) {}
void lower_background_noise(UNUSED s32 a) {}
void raise_background_noise(UNUSED s32 a) {}
void obj_mark_for_deletion(UNUSED struct Object *obj) {}
void obj_scale(UNUSED struct Object *obj, UNUSED f32 scale) {}
void obj_set_held_state(UNUSED struct Object *obj, UNUSED const BehaviorScript *heldBehavior) {}
void override_viewport_and_clip(UNUSED Vp *a, UNUSED Vp *b, UNUSED u8 c, UNUSED u8 d, UNUSED u8 e) {}
void play_cap_music(UNUSED u16 seqArgs) {}
void play_course_clear(void) {}
void play_cutscene_music(UNUSED u16 seqArgs) {}
void play_infinite_stairs_music(void) {}
void play_music(UNUSED u8 player, UNUSED u16 seqArgs, UNUSED u16 fadeTimer) {}
void play_peachs_jingle(void) {}
void play_shell_music(void) {}
void play_transition(UNUSED s16 transType, UNUSED s16 time, UNUSED u8 red, UNUSED u8 green, UNUSED u8 blue) {}
void print_text_fmt_int(UNUSED s32 x, UNUSED s32 y, UNUSED const char *str, UNUSED s32 n) {}
void reset_cutscene_msg_fade(void) {}
void save_file_clear_flags(UNUSED u32 flags) {}
void save_file_collect_star_or_key(UNUSED s16 coinScore, UNUSED s16 starIndex) {}
void save_file_do_save(UNUSED s32 fileIndex) {}
void save_file_set_cap_pos(UNUSED s16 x, UNUSED s16 y, UNUSED s16 z) {}
void save_file_set_flags(UNUSED u32 flags) {}
void seq_player_lower_volume(UNUSED u8 player, UNUSED u16 fadeDuration, UNUSED u8 percentage) {}
void seq_player_unlower_volume(UNUSED u8 player, UNUSED u16 fadeDuration) {}
void set_camera_mode(UNUSED struct Camera *c, UNUSED s16 mode, UNUSED s16 frames) {}
void set_camera_shake_from_hit(UNUSED s16 shake) {}
void set_cutscene_message(UNUSED s16 xOffset, UNUSED s16 yOffset, UNUSED s16 msgIndex, UNUSED s16 msgDuration) {}
void set_menu_mode(UNUSED s16 mode) {}
void set_sound_moving_speed(UNUSED u8 bank, UNUSED u8 speed) {}
void sound_banks_enable(UNUSED u8 player, UNUSED u16 bankMask) {}
void spawn_default_star(UNUSED f32 homeX, UNUSED f32 homeY, UNUSED f32 homeZ) {}
void spawn_wind_particles(UNUSED s16 pitch, UNUSED s16 yaw) {}
void stop_cap_music(void) {}
void stop_shell_music(void) {}
void stop_sound(UNUSED u32 soundBits, UNUSED f32 *pos) {}

// Objects the character code compares against by address; none of them exist on the island.
#define NO_BEHAVIOR(name) const BehaviorScript name[] = { 0 }
NO_BEHAVIOR(bhvBowser);
NO_BEHAVIOR(bhvBowserKeyCourseExit);
NO_BEHAVIOR(bhvBowserKeyUnlockDoor);
NO_BEHAVIOR(bhvCarrySomething3);
NO_BEHAVIOR(bhvCarrySomething4);
NO_BEHAVIOR(bhvCarrySomething5);
NO_BEHAVIOR(bhvCelebrationStar);
NO_BEHAVIOR(bhvEndPeach);
NO_BEHAVIOR(bhvEndToad);
NO_BEHAVIOR(bhvGiantPole);
NO_BEHAVIOR(bhvJumpingBox);
NO_BEHAVIOR(bhvKoopaShellUnderwater);
NO_BEHAVIOR(bhvMetalCap);
NO_BEHAVIOR(bhvNormalCap);
NO_BEHAVIOR(bhvSparkleSpawn);
NO_BEHAVIOR(bhvStarKeyCollectionPuffSpawner);
NO_BEHAVIOR(bhvStaticObject);
NO_BEHAVIOR(bhvTree);
NO_BEHAVIOR(bhvUnlockDoorStar);
NO_BEHAVIOR(bhvVanishCap);
NO_BEHAVIOR(bhvWingCap);
const Collision warp_pipe_seg3_collision_03009AC8[] = { 0 };

u32 gAudioRandom;
struct Camera *gCamera;
s16 gCheckingSurfaceCollisionsForCamera;
struct CreditsEntry *gCurrCreditsEntry;
s8 gDebugLevelSelect;
s32 gDialogResponse;
s16 gFindFloorIncludeSurfaceIntangible;
f32 gGlobalSoundSource[3];
u8 gLastCompletedCourseNum;
u8 gLastCompletedStarNum;
struct NumTimesCalled gNumCalls;
s32 gNumFindFloorMisses;
f32 gPaintingMarioYEntry;
s16 gSaveOptSelectIndex;
