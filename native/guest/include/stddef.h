#ifndef BOOGLE_STDDEF_H
#define BOOGLE_STDDEF_H

typedef __SIZE_TYPE__ size_t;
typedef __PTRDIFF_TYPE__ ptrdiff_t;
#define NULL ((void *) 0)
#define offsetof(st, m) __builtin_offsetof(st, m)

#endif
