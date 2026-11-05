// The bounded t1v02 legacy recovery upgrade may only replay with these exact source bytes.
// Shared runtime dependencies and home land are byte-identical to 3e37f124; railway-v0 and tune-v0
// files retain its frozen implementations. The supply-v1 copies pin the accepted 236f689a profile;
// neither profile can replay through the live catalog or sync after main's tunables integration.
// This deliberately fails closed after any shared-code edit, including
// an unversioned accepted-tail semantic change. Do not refresh hashes to make a new build pass:
// preserve the frozen implementation or review this one migration against the old fixture first.
// server/Dockerfile copies these .ts/.json files unchanged; Node runs the source directly.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const FROZEN = {
  'src/sim/ball-rest.ts': '34618cb76b4f7bcbb1ddbf43d282b45d9c0c75f6345c45f6a1728e046654a261',
  'src/sim/bank.ts': 'a6c1113239570f843fa01110738462d39a5037335970da906b50e306b244bbca',
  'src/sim/era.ts': 'c04e482bf7a5fec73ca8b29cb8e33a93c0ba323d359debee1b7dde50a1dda82b',
  'src/sim/gift-catalog.ts': '58a3c20bf24e6c40a814136aa607658e78b546ac65994e22361f5d41143b2247',
  'src/sim/gifts.ts': '5823fb034c749f99ce6396cb8ee74414187f8da7f9f3f4aac8ee89a99fe90079',
  'src/sim/hash.ts': 'b954a11bec96d0406cac42b96e8fbf3613189635f049750694d8340b8b785aac',
  'src/sim/materials.ts': 'de3d97b8ed0313ea2b24bc2d26957710e26983382e0aef4ab76dc7cb5376e9f1',
  'src/sim/piles.ts': 'ebe6d760a874bc89cc349f31956486ea68a6853dad64d4b5fca2215658302082',
  'src/sim/railway-layout.ts': '90c4f1800ca6824ac0d159a448969bb9ff8d3076f16b250a46f30a4ad9e6018d',
  'src/sim/railway-v0.ts': 'f02519c0c43f7db3acff5026123e2557bed8f480111326959f42f308d06ce5d6',
  'src/sim/rng.ts': '302b041f8934bd588ab94e50786ba1bf63c7aa17e8a5141e782f5bf1000bd60b',
  'src/sim/roster.ts': '2b818692308e025f6a513b5918e4f9fa070269cf7b8374423bc17ccd8c7a3442',
  'src/sim/route.ts': 'fd00a134797346cba2dfaa8817b03884245aeb090bc5d7b042e76c33791dfd51',
  'src/sim/scripted-run.ts': '070013f9d44fa7f5df8f084f8a8c22a82d27f0b013c5d43d1f42e92d0afed454',
  'src/sim/sites.ts': '33687af8f59495fd45bfe5a5edd9221965c54239e90fe244419375c74ee38d8c',
  'src/sim/sources.ts': 'c9d29529810df69644ded4e3932d5fc1a3843762e6e91a5c26b3a29eed75a86f',
  'src/sim/stacks.ts': '9c758b5f858b3343389be0ac020c3dd166c22a6d6bcab5ef7933e8a1cce62882',
  'src/sim/tune-v0.ts': '744a17974a5d6f918ef58bf323848be94daba10949388acf2ee9a82413fa7744',
  'src/sim/wagon.ts': '8cdde76fe03526bea4cf8850c537175bf0f900b2a83f5005f859fd827e4614b2',
  'src/world/home-land.json': 'b177f8b87dcccb0373c13fd7f1cf87368892e30eebaee7b76139eb6f150026f2',
  'src/world/rules/ball.ts': '9e30a4412e1c19168c23b298a32b992fe253bc753d742d01a5ea115a61fd5129',
  'src/world/rules/bank.ts': '95db5ba767b1c0750e7b5d8fc1cccf196cb7ec58520787bdbef3d732c53ad53e',
  'src/world/rules/edit-gen.ts': '281a82086059b504f98f20976b9cb44e93ba5ce6557e32638cea00a84a9787c2',
  'src/world/rules/gifts.ts': 'a972f802ac085dc68128cab0f9b7405dd9542e16edd62cd48944676061e46f41',
  'src/world/rules/opening.ts': '0c91a2050fa23548a6a645cd549d96ac4140352bb4b797179d06cc9aef559551',
  'src/world/rules/piles.ts': 'edd90181c5cd2dd4ddd43207fe598d2dd81b9fd8e27a629f187e6427dc54ff84',
  'src/world/rules/railway-v0-index.ts': '4bec83c5641f93bc48d4d444fb27bc7698a68b8b1bfa2a7a11d86280150edbdc',
  'src/world/rules/railway-v0.ts': '47d1495b89a50e42398700b479ff4063068dbc09bdc80fb3199d89e1c4da2f2f',
  'src/world/rules/roster.ts': '1c14eeaee0168fb9cac124ace768f94dd5e985fad447df2d177dea28574110b6',
  'src/world/rules/sites.ts': 'd4e85e974b7621ebb5d42707eb8477dffc51366db8574b8126ab7bc60ea671c2',
  'src/world/rules/sources.ts': '56017063d8018c576741d215bd731ddff419f0bc57ce0ef68f980d942d69e752',
  'src/world/rules/stacks.ts': 'b8f34c13df4392cf4c2dca591d40aad6884363f0ebbeba4d3d6aa311dcf352c5',
  'src/world/rules/tune-v0.ts': '597bcfd1cfb1cd69865035661e5a7a0340ec34f6733b5ffa9c987f795059a32d',
  'server/src/legacy/world/sync-v0.ts': '11aff2a2962a4cc9b30d1b03e8a8b9ff222ac7dde4cbc383425412f0bc92d3b9',
  'src/sim/tune-supply-v1.ts': 'cf712bfcdb2d030a0244181fcd6228075073eefc55d66a1faa73ee95624049ce',
  'src/world/rules/tune-supply-v1.ts': '1b39032d85dad160c19d42ccf8e19e1776b571ed35b64d2dfc69fd82902a6a8c',
  'src/world/rules/railway-supply-v1.ts': 'e4cb536011c652f6904c3a884b453d44a4ad90c2f30a099edde1c9607e0b6d2a',
  'src/world/rules/railway-supply-v1-index.ts': 'ce0d0e4aa2a9644ca54f8b5e653fc30ce867beb561f7d8fdedc809b8fec21440',
  'src/sim/railway.ts': 'a9cd9fa71ad8de49e94b7d29a7cb6114a031a1737697d68615b9780561f50510',
  'src/sim/railway-supply.ts': 'e31bac3e5026ea34fbd8929d03b0e61cbd1a82230580ce6920a1d18883b2e490',
  'server/src/legacy/sim/roster.ts': 'aff9abbffa2e93e09ebfd2db4bcf992ceb52635807343296165d97c5289837cc',
  'server/src/legacy/world/rules/types.ts': '21d0c560d71c76e2371acf4b11cf5c301e85fddcb7f4c42ad7e025b5d349109f',
} as const;

export async function verifyRailwayV0Code() {
  await Promise.all(
    Object.entries(FROZEN).map(async ([file, expected]) => {
      const bytes = await readFile(new URL(`../../../${file}`, import.meta.url));
      if (createHash('sha256').update(bytes).digest('hex') !== expected)
        throw new Error(`T1 v0 recovery verifier changed: ${file}`);
    }),
  );
}
