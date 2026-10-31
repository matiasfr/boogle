// The guest's collision: the triangles src/guest/collision.js gathers around him each tick, loaded into upstream's
// static spatial partition, plus one water level for the whole local frame.
#include "engine/surface_load.c"
#include "shim.h"

#define MAX_SURFACES 4096

s32 gSurfaceNodesAllocated;
s32 gSurfacesAllocated;
s32 gNumStaticSurfaceNodes;
s32 gNumStaticSurfaces;
TerrainData *gEnvironmentRegions;

static struct Surface sSurfaces[MAX_SURFACES];
static struct SurfaceNode sNodes[MAX_SURFACES * 4];
static f32 sTris[MAX_SURFACES * 10];
static TerrainData sWater[] = { 1, 0, -0x7FFF, -0x7FFF, 0x7FFF, 0x7FFF, FLOOR_LOWER_LIMIT };

EXPORT f32 *guest_surface_buffer(void) {
    return sTris;
}

EXPORT u32 guest_surface_capacity(void) {
    return MAX_SURFACES;
}

// Each triangle is x1 y1 z1 x2 y2 z2 x3 y3 z3 type, counter-clockwise seen from the side it faces.
EXPORT void guest_load_surfaces(s32 count, f32 waterLevel) {
    sSurfacePool = sSurfaces;
    sSurfaceNodePool = sNodes;
    sSurfacePoolSize = MAX_SURFACES;
    gSurfacesAllocated = 0;
    gSurfaceNodesAllocated = 0;
    clear_static_surfaces();
    clear_spatial_partition(&gDynamicSurfacePartition[0][0]);

    if (count > MAX_SURFACES) {
        count = MAX_SURFACES;
    }
    for (s32 i = 0; i < count; i++) {
        f32 *t = &sTris[i * 10];
        TerrainData verts[9];
        TerrainData index[3] = { 0, 1, 2 };
        TerrainData *indexPtr = index;
        for (s32 k = 0; k < 9; k++) {
            verts[k] = (TerrainData) t[k];
        }
        struct Surface *surface = read_surface_data(verts, &indexPtr);
        if (surface != NULL) {
            surface->type = (TerrainData) t[9];
            add_surface(surface, FALSE);
        }
    }
    gNumStaticSurfaces = gSurfacesAllocated;
    gNumStaticSurfaceNodes = gSurfaceNodesAllocated;

    sWater[6] = (TerrainData) waterLevel;
    gEnvironmentRegions = sWater;
}
