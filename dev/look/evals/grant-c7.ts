// npm run look -- --real --rail-seed glide-earned --query c7=hook --eval dev/look/evals/grant-c7.ts --action dev/look/evals/grant-c7-action.ts --warm 0 --video --seconds 4 --hud --name c7-interact-r2
// c7=glide takes the optional air jump, then checks Jump-close. c7=teach needs --rail-seed hook-taken to take a fresh
// glider before its first-fall teach. c7Input=touch frames the actual touch buttons. Setup timing is real-time too.
const { stage } = (await import('/dev/look/bots/grant-c7.ts' as string)) as typeof import('../bots/grant-c7.ts');
await stage();
export {};
