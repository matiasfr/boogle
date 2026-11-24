// The canyon kit's built file (./view.ts loads it). Its own module, so a check that imports the view mocks this one
// import rather than reading a .glb (test/helpers/prefab-startup.ts mocks a consumer's relative imports).
import url from '../../../assets/built/terrain-kit.glb?url';
export default url;
