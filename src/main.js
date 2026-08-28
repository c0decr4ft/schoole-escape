import * as THREE from "three";

const hud = document.getElementById("hud");
const countdownEl = document.getElementById("countdown");
const promptEl = document.getElementById("prompt");
const endEl = document.getElementById("end");

const KEYS = {};
addEventListener("keydown", (e) => {
  KEYS[e.code] = true;
  if (e.code === "KeyE") tryInteract();
});
addEventListener("keyup", (e) => {
  KEYS[e.code] = false;
});

const clickToPlayEl = document.getElementById("clickToPlay");
const MOUSE_SENS = 0.002;

const wallBoxes = [];
const walkSurfaces = [];
/** Floors only — used for vertical snap (desks are NOT here, avoids “floating” / classroom glitch). */
const floorWalkSurfaces = [];
const interactDoorMeshes = [];

function addFloorSlab(cx, cz, w, d, yBottom, mat, thickness = 0.22) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
  mesh.position.set(cx, yBottom + thickness / 2, cz);
  mesh.receiveShadow = true;
  mesh.userData.walkSurface = true;
  mesh.userData.isFloorSlab = true;
  scene.add(mesh);
  walkSurfaces.push(mesh);
  floorWalkSurfaces.push(mesh);
  return mesh;
}

function addCeiling(cx, cz, w, d, yBottom, mat, thickness = 0.2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
  mesh.position.set(cx, yBottom + thickness / 2, cz);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addWall(x, y, z, w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  wallBoxes.push(new THREE.Box3().setFromObject(mesh));
  return mesh;
}

function addBaseboardAlongX(cx, cz, lenX, y, zExtent, side) {
  const h = 0.14;
  const t = 0.06;
  const zOff = (zExtent / 2 + t / 2) * side;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(lenX, h, t), mTrim);
  mesh.position.set(cx, y + h / 2, cz + zOff);
  mesh.castShadow = true;
  scene.add(mesh);
}

function addBaseboardAlongZ(cx, cz, lenZ, y, xExtent, side) {
  const h = 0.14;
  const t = 0.06;
  const xOff = (xExtent / 2 + t / 2) * side;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, lenZ), mTrim);
  mesh.position.set(cx + xOff, y + h / 2, cz);
  mesh.castShadow = true;
  scene.add(mesh);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7a93a8);
scene.fog = new THREE.Fog(0x9eb0c2, 72, 235);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xd8e8ff, 0x353540, 0.52));
const sun = new THREE.DirectionalLight(0xfff2dd, 0.82);
sun.position.set(26, 52, 18);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 160;
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
scene.add(sun);
scene.add(new THREE.DirectionalLight(0xb8c8e8, 0.2).translateX(-30).translateY(22));

const mFloorClass = new THREE.MeshStandardMaterial({ color: 0xc4b8a8, roughness: 0.88, metalness: 0.02 });
const mFloorHall = new THREE.MeshStandardMaterial({ color: 0x9a9085, roughness: 0.82, metalness: 0.03 });
const mStairTread = new THREE.MeshStandardMaterial({
  color: 0xd4c4a8,
  roughness: 0.62,
  metalness: 0.12,
  emissive: 0x2a2218,
  emissiveIntensity: 0.12,
});
const mFloorBasement = new THREE.MeshStandardMaterial({ color: 0x5a5860, roughness: 0.94 });
const mFloorRoof = new THREE.MeshStandardMaterial({ color: 0x7a7a82, roughness: 0.9 });
const mWall = new THREE.MeshStandardMaterial({
  color: 0xeee9e1,
  roughness: 0.91,
  side: THREE.DoubleSide,
});
const mCeiling = new THREE.MeshStandardMaterial({ color: 0xe4dfd6, roughness: 0.95, side: THREE.DoubleSide });
const mTrim = new THREE.MeshStandardMaterial({ color: 0x3d3a36, roughness: 0.88, side: THREE.DoubleSide });
const mDoorTemplate = new THREE.MeshStandardMaterial({
  color: 0x3a2615,
  roughness: 0.72,
  metalness: 0.05,
  side: THREE.DoubleSide,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  depthTest: true,
});
const mGlass = new THREE.MeshPhysicalMaterial({
  color: 0xa8d4ff,
  metalness: 0.06,
  roughness: 0.1,
  transmission: 0.55,
  thickness: 0.3,
  transparent: true,
  opacity: 0.9,
});
const mChalk = new THREE.MeshStandardMaterial({ color: 0x2a4536, roughness: 0.96, side: THREE.DoubleSide });
const mDesk = new THREE.MeshStandardMaterial({ color: 0x4a3528, roughness: 0.78 });
const mMetal = new THREE.MeshStandardMaterial({ color: 0x8a9098, metalness: 0.5, roughness: 0.48 });
const mLightPanel = new THREE.MeshStandardMaterial({ color: 0xf5f8ff, emissive: 0xaab8d0, emissiveIntensity: 0.35, roughness: 0.4 });
const mSkin = new THREE.MeshStandardMaterial({ color: 0xe8c4a8, roughness: 0.72 });
const mBlouse = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.65 });
const mSkirt = new THREE.MeshStandardMaterial({ color: 0x2a3548, roughness: 0.78 });
const mHairTeach = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.88 });
const mShoesF = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.76 });
const mEyeWhite = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.35 });
const mEyeRage = new THREE.MeshStandardMaterial({
  color: 0x220000,
  emissive: 0xff1a1a,
  emissiveIntensity: 1.2,
  roughness: 0.4,
});

function buildTeacherFemale() {
  const g = new THREE.Group();

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.62, 16, 1), mSkirt);
  skirt.position.set(0, 0.36, 0);
  skirt.castShadow = true;
  g.add(skirt);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.24), mBlouse);
  torso.position.set(0, 0.92, 0);
  torso.castShadow = true;
  g.add(torso);

  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mBlouse);
  shoulderL.position.set(-0.24, 1.12, 0);
  shoulderL.castShadow = true;
  g.add(shoulderL);
  const shoulderR = shoulderL.clone();
  shoulderR.position.x = 0.24;
  g.add(shoulderR);

  const armLU = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 4, 8), mBlouse);
  armLU.position.set(-0.32, 0.98, 0.02);
  armLU.rotation.z = 0.35;
  armLU.castShadow = true;
  g.add(armLU);
  const armRU = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 4, 8), mBlouse);
  armRU.position.set(0.32, 0.98, 0.02);
  armRU.rotation.z = -0.35;
  armRU.castShadow = true;
  g.add(armRU);

  const armLL = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.2, 4, 8), mSkin);
  armLL.position.set(-0.4, 0.68, 0.06);
  armLL.rotation.set(0.25, 0, 0.15);
  armLL.castShadow = true;
  g.add(armLL);
  const armRL = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.2, 4, 8), mSkin);
  armRL.position.set(0.4, 0.68, 0.06);
  armRL.rotation.set(0.25, 0, -0.15);
  armRL.castShadow = true;
  g.add(armRL);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.36, 4, 10), mSkin);
  legL.position.set(-0.12, 0.38, 0);
  legL.castShadow = true;
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.12;
  g.add(legR);

  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.26), mShoesF);
  shoeL.position.set(-0.12, 0.03, 0.04);
  shoeL.castShadow = true;
  g.add(shoeL);
  const shoeR = shoeL.clone();
  shoeR.position.x = 0.12;
  g.add(shoeR);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.14, 10), mSkin);
  neck.position.set(0, 1.22, 0);
  neck.castShadow = true;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 16), mSkin);
  head.position.set(0, 1.36, 0.015);
  head.castShadow = true;
  g.add(head);

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), mHairTeach);
  hairBack.position.set(0, 1.42, -0.06);
  hairBack.scale.set(1.05, 0.85, 0.95);
  hairBack.castShadow = true;
  g.add(hairBack);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mHairTeach);
  bun.position.set(0.02, 1.52, -0.14);
  bun.castShadow = true;
  g.add(bun);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mSkin);
  nose.position.set(0, 1.34, 0.12);
  g.add(nose);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), mEyeWhite.clone());
  eyeL.position.set(-0.045, 1.38, 0.1);
  g.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), mEyeWhite.clone());
  eyeR.position.set(0.045, 1.38, 0.1);
  g.add(eyeR);

  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.5 }));
  pupilL.position.set(-0.045, 1.38, 0.118);
  g.add(pupilL);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.5 }));
  pupilR.position.set(0.045, 1.38, 0.118);
  g.add(pupilR);

  function setRage(on) {
    const mat = on ? mEyeRage : mEyeWhite;
    eyeL.material = mat;
    eyeR.material = mat;
    pupilL.visible = !on;
    pupilR.visible = !on;
  }

  return { root: g, armLU, armRU, legL, legR, torso, setRage, eyeL, eyeR };
}

function buildPlayerArmsViewmodel() {
  const root = new THREE.Group();
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x4a6a9a, roughness: 0.52 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc8956e, roughness: 0.82 });

  const foreL = new THREE.Group();
  const fl = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.34, 4, 8), sleeve);
  fl.rotation.z = 0.45;
  foreL.add(fl);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), skin);
  hl.position.set(0.12, -0.14, 0.03);
  foreL.add(hl);
  foreL.position.set(-0.38, -0.2, -0.42);
  root.add(foreL);

  const foreR = new THREE.Group();
  const fr = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.34, 4, 8), sleeve);
  fr.rotation.z = -0.45;
  foreR.add(fr);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), skin);
  hr.position.set(-0.12, -0.14, 0.03);
  foreR.add(hr);
  foreR.position.set(0.34, -0.22, -0.44);
  root.add(foreR);

  root.position.set(0.12, -0.18, -0.05);
  return { root, foreL, foreR };
}

const mStudentShirts = [
  new THREE.MeshStandardMaterial({ color: 0x4a6a9a, roughness: 0.65 }),
  new THREE.MeshStandardMaterial({ color: 0x6a4a6a, roughness: 0.65 }),
  new THREE.MeshStandardMaterial({ color: 0x5a6a5a, roughness: 0.65 }),
  new THREE.MeshStandardMaterial({ color: 0x7a6048, roughness: 0.65 }),
  new THREE.MeshStandardMaterial({ color: 0x485a7a, roughness: 0.65 }),
];
const mStudentSkin = new THREE.MeshStandardMaterial({ color: 0xd8b090, roughness: 0.78 });
const mStudentHair = new THREE.MeshStandardMaterial({ color: 0x2c241c, roughness: 0.88 });
const mStudentPants = new THREE.MeshStandardMaterial({ color: 0x2a3048, roughness: 0.82 });
const mStudentShoes = new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.76 });
const mStudentEyeWhite = new THREE.MeshStandardMaterial({ color: 0xf2f2f5, roughness: 0.4 });
const mStudentPupil = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.45 });
const mChairPlastic = new THREE.MeshStandardMaterial({ color: 0x3d4555, roughness: 0.72, metalness: 0.08 });

/** Chair: back faces local −Z, seat opens toward local +Z (same convention as seated student). */
function addStudentChair(wx, wy, wz, rotY) {
  const root = new THREE.Group();
  root.position.set(wx, wy, wz);
  root.rotation.y = rotY;
  const legH = 0.43;
  const seatTh = 0.055;
  const seatCenterY = legH + seatTh / 2;
  for (const [sx, sz] of [
    [-0.17, -0.15],
    [0.17, -0.15],
    [-0.17, 0.16],
    [0.17, 0.16],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, legH, 6), mMetal);
    leg.position.set(sx, legH / 2, sz);
    leg.castShadow = true;
    root.add(leg);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, seatTh, 0.42), mChairPlastic);
  seat.position.set(0, seatCenterY, 0.02);
  seat.castShadow = true;
  seat.receiveShadow = true;
  root.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.055), mChairPlastic);
  back.position.set(0, seatCenterY + 0.22, -0.2);
  back.rotation.x = -0.14;
  back.castShadow = true;
  root.add(back);
  scene.add(root);
}

/** Local +Z = toward chalkboard. Sit on door side of desk: offset along ±Z from desk center. */
function addSeatedStudent(wx, wy, wz, shirtMat, faceTowardNegZ) {
  const g = new THREE.Group();
  g.position.set(wx, wy, wz);
  if (faceTowardNegZ) g.rotation.y = Math.PI;
  const sc = 1.12;
  g.scale.setScalar(sc);
  const pants = mStudentPants;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.24), shirtMat);
  torso.position.set(0, 0.52, 0.02);
  torso.castShadow = true;
  g.add(torso);
  const thighL = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.2, 4, 6), pants);
  thighL.position.set(-0.11, 0.34, 0.14);
  thighL.rotation.x = 1.05;
  thighL.rotation.z = 0.12;
  thighL.castShadow = true;
  g.add(thighL);
  const thighR = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.2, 4, 6), pants);
  thighR.position.set(0.11, 0.34, 0.14);
  thighR.rotation.x = 1.05;
  thighR.rotation.z = -0.12;
  thighR.castShadow = true;
  g.add(thighR);
  const shinL = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.16, 4, 6), pants);
  shinL.position.set(-0.1, 0.16, 0.32);
  shinL.rotation.x = 0.35;
  shinL.castShadow = true;
  g.add(shinL);
  const shinR = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.16, 4, 6), pants);
  shinR.position.set(0.1, 0.16, 0.32);
  shinR.rotation.x = 0.35;
  shinR.castShadow = true;
  g.add(shinR);
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), mStudentShoes);
  shoeL.position.set(-0.1, 0.04, 0.38);
  shoeL.castShadow = true;
  g.add(shoeL);
  const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), mStudentShoes);
  shoeR.position.set(0.1, 0.04, 0.38);
  shoeR.castShadow = true;
  g.add(shoeR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mStudentSkin);
  head.position.set(0, 0.86, 0.04);
  head.castShadow = true;
  g.add(head);
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mStudentHair);
  hairTop.position.set(0, 0.94, 0.02);
  hairTop.scale.set(1.08, 0.72, 1.05);
  g.add(hairTop);
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mStudentHair);
  hairBack.position.set(0, 0.88, -0.1);
  hairBack.scale.set(1.15, 0.85, 0.55);
  g.add(hairBack);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), mStudentEyeWhite);
  eyeL.position.set(-0.048, 0.88, 0.124);
  g.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), mStudentEyeWhite);
  eyeR.position.set(0.048, 0.88, 0.124);
  g.add(eyeR);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), mStudentPupil);
  pupilL.position.set(-0.048, 0.88, 0.136);
  g.add(pupilL);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), mStudentPupil);
  pupilR.position.set(0.048, 0.88, 0.136);
  g.add(pupilR);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.18, 4, 6), shirtMat);
  armL.position.set(-0.24, 0.5, 0.1);
  armL.rotation.x = 0.88;
  armL.rotation.z = 0.22;
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.18, 4, 6), shirtMat);
  armR.position.set(0.24, 0.5, 0.1);
  armR.rotation.x = 0.88;
  armR.rotation.z = -0.22;
  g.add(armR);
  scene.add(g);
}

function addClassroomFurniture(wx, wz, yBase, facingBoardNegZ) {
  const shirt = (i) => mStudentShirts[i % mStudentShirts.length];
  const towardDoor = facingBoardNegZ ? 1 : -1;
  const seatZOff = 0.48;
  const chairRot = facingBoardNegZ ? Math.PI : 0;
  const seatTopY = yBase + 0.43 + 0.055;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const lx = wx - 4.35 + i * 2.9;
      const lz = wz - 1.25 + j * 2.12;
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.07, 0.78), mDesk);
      top.position.set(lx, yBase + 0.9, lz);
      top.castShadow = true;
      scene.add(top);
      for (const ox of [-0.55, 0.55]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.82, 6), mMetal);
        leg.position.set(lx + ox, yBase + 0.41, lz);
        leg.castShadow = true;
        scene.add(leg);
      }
      const seatZ = lz + towardDoor * seatZOff;
      addStudentChair(lx, yBase, seatZ, chairRot);
      addSeatedStudent(lx, seatTopY, seatZ, shirt(i * 3 + j), facingBoardNegZ);
    }
  }
}

const groundFar = new THREE.Mesh(
  new THREE.PlaneGeometry(420, 420),
  new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 1 })
);
groundFar.rotation.x = -Math.PI / 2;
groundFar.position.y = -42;
groundFar.receiveShadow = true;
scene.add(groundFar);

const FLOOR_H = 4.25;
const WALL_T = 0.36;
const classW = 14;
const classD = 10;
const hallLen = 86;
const hallW = 4.35;
/** Shared plane: start-classroom north wall == hall south wall (no double-offset). */
const hallZSouth = classD / 2 + WALL_T / 2;
const hallZ0 = hallZSouth + hallW / 2;
const hallZNorth = hallZ0 + hallW / 2;
const hallNorthEdge = hallZ0 + hallW * 0.5;
const hallSouthEdge = hallZ0 - hallW * 0.5;

/** Stairwells at east/west ends of the long hall (near side walls), opening north. */
const hallHalfLen = hallLen * 0.5;
const stairX = hallHalfLen - 2.35;
const stairXWest = -hallHalfLen + 2.35;
const stairStartZ = hallZNorth + 0.55;
const stairGapHalf = 2.25;
const stairStepW = 3.2;
const stairStepD = 0.42;

/** Door lintel + wall fill above a doorway opening. */
function addDoorLintel(cx, z, yBase, openW, thick) {
  const lintelY = yBase + 2.25;
  const lintelH = 1.12;
  addWall(cx, lintelY, z, openW + 0.2, lintelH, thick * 0.85, mTrim);
  const lintelTop = lintelY + lintelH;
  const headH = yBase + FLOOR_H - lintelTop;
  if (headH > 0.08) {
    addWall(cx, lintelTop, z, openW + 0.32, headH, thick, mWall);
  }
}

function makeWindowBay(wx, wz, rotY, floorY) {
  const g = new THREE.Group();
  const wy = 2.35;
  g.position.set(wx, floorY + wy / 2 + 0.35, wz);
  g.rotation.y = rotY;
  const sill = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.35), mTrim);
  sill.position.y = -wy / 2 + 0.06;
  sill.castShadow = true;
  g.add(sill);
  for (const sx of [-1.05, 1.05]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.14, wy + 0.2, 0.22), mTrim);
    frame.position.set(sx, 0, 0.05);
    frame.castShadow = true;
    g.add(frame);
  }
  const frameT = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.22), mTrim);
  frameT.position.set(0, wy / 2, 0.05);
  g.add(frameT);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, wy - 0.15), mGlass);
  glass.position.z = 0.08;
  g.add(glass);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(0x6eb8ff) },
      uBot: { value: new THREE.Color(0xc8dff5) },
      uFloor: { value: floorY },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uBot; uniform float uFloor; varying vec2 vUv;
      void main(){ vec3 c=mix(uBot,uTop,vUv.y); c*=0.9+0.1*sin(uFloor*0.12+vUv.x*5.0); gl_FragColor=vec4(c,1.0);} `,
    side: THREE.BackSide,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2.1, wy), skyMat);
  sky.position.z = -0.12;
  g.add(sky);
  scene.add(g);
}

function addFluorescentStrip(cx, cz, lenX, floorY) {
  const w = Math.min(lenX, 3.2);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.55), mLightPanel);
  panel.rotation.x = Math.PI / 2;
  panel.position.set(cx, floorY + FLOOR_H - 0.08, cz);
  scene.add(panel);
}

const doors = [];
const doorColliders = new Map();

function createSwingDoor(opts) {
  const group = new THREE.Group();
  group.position.set(opts.hingeX, opts.hingeY, opts.hingeZ);
  const thick = Math.max(opts.depth ?? 0.12, 0.22);
  const doorMat = mDoorTemplate.clone();
  doorMat.transparent = false;
  doorMat.opacity = 1;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(opts.width, opts.height, thick), doorMat);
  panel.position.set(opts.width / 2, opts.height / 2, 0);
  panel.castShadow = true;
  panel.receiveShadow = true;
  panel.renderOrder = 3;
  panel.userData.swingDoorRef = null;
  group.add(panel);
  scene.add(group);
  const open = !!opts.startOpen;
  const ang = open ? opts.openAngle : opts.closedAngle;
  const door = {
    name: opts.name,
    group,
    panel,
    closed: !open,
    closedAngle: opts.closedAngle,
    openAngle: opts.openAngle,
    currentAngle: ang,
    targetAngle: ang,
    blocksWhenClosed: opts.blocksWhenClosed,
    swingSpeed: 5.2,
  };
  panel.userData.swingDoorRef = door;
  interactDoorMeshes.push(panel);
  group.rotation.y = ang;
  doors.push(door);
  syncSwingDoorCollider(door);
  return door;
}

function syncSwingDoorCollider(door) {
  if (!door.blocksWhenClosed) return;
  const thresh = 0.32;
  const closedEnough = Math.abs(door.currentAngle - door.closedAngle) < thresh;
  if (closedEnough) doorColliders.set(door, new THREE.Box3().setFromObject(door.group));
  else doorColliders.delete(door);
}

function updateDoorAnimations(dt) {
  for (const door of doors) {
    const diff = door.targetAngle - door.currentAngle;
    if (Math.abs(diff) < 0.01) door.currentAngle = door.targetAngle;
    else door.currentAngle += Math.sign(diff) * Math.min(Math.abs(diff), door.swingSpeed * dt);
    door.group.rotation.y = door.currentAngle;
    syncSwingDoorCollider(door);
  }
}

// ——— Start classroom ———
const doorOpenW = 1.15;
const doorGapHalf = doorOpenW / 2;
/** Swing leaf must span hinge → far jamb + overlap. */
const classSwingDoorW = doorOpenW + 0.14;
const classSwingDoorH = 2.27;
const classSwingDoorDepth = 0.28;
const classDoorCenterX = 0.45;
/** Same plane as hall south wall — one shared wall, not two offset slabs. */
const classFrontZ = hallZSouth;
/** Waypoint in the doorway — steer teacher here first until she’s in the hall. */
const CLASS_EXIT_X = classDoorCenterX + 0.18;
const CLASS_EXIT_Z = classFrontZ + 0.92;

addFloorSlab(0, ( -classD / 2 + hallSouthEdge) / 2, classW + 0.5, hallSouthEdge - (-classD / 2) + 0.2, 0, mFloorClass);
addCeiling(0, 0, classW + 0.6, classD + 0.6, FLOOR_H, mCeiling);
addFluorescentStrip(-3, 0, 6, 0);
addFluorescentStrip(4, -2, 6, 0);

addWall(0, 0, -classD / 2 - WALL_T / 2, classW + WALL_T, FLOOR_H, WALL_T, mWall);
{
  const sideZ0 = -classD / 2 - WALL_T / 2;
  const sideZ1 = hallZSouth;
  const sideDepth = sideZ1 - sideZ0;
  const sideCz = (sideZ0 + sideZ1) / 2;
  addWall(-classW / 2 - WALL_T / 2, 0, sideCz, WALL_T, FLOOR_H, sideDepth, mWall);
  addWall(classW / 2 + WALL_T / 2, 0, sideCz, WALL_T, FLOOR_H, sideDepth, mWall);
}

/** Front wall = hall south wall segment across the classroom (built in corridor with matching gap). */
addDoorLintel(classDoorCenterX, classFrontZ, 0, doorOpenW, WALL_T);

addBaseboardAlongX(0, -classD / 2 + 0.2, classW, 0, WALL_T, 1);
addBaseboardAlongX(0, classFrontZ, classW, 0, WALL_T, -1);

const board = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.35, 0.12), mChalk);
board.position.set(-2, 1.42, -classD / 2 + 0.32);
board.castShadow = true;
scene.add(board);

addClassroomFurniture(0, 0, 0, true);

function buildCorridorShell(yBase, hallLenLocal, omitEastCap, cutClassDoorGap) {
  const h2 = hallLenLocal / 2;
  addFloorSlab(0, hallZ0, hallLenLocal + 1, hallW, yBase, mFloorHall);
  addCeiling(0, hallZ0, hallLenLocal + 1.2, hallW + 0.4, yBase + FLOOR_H, mCeiling);

  if (cutClassDoorGap) {
    /** Gap matches classroom door exactly so walls meet jambs (no see-through strip). */
    const gx0 = classDoorCenterX - doorGapHalf;
    const gx1 = classDoorCenterX + doorGapHalf;
    if (gx0 > -h2 + 0.05) {
      const wL = gx0 + h2;
      addWall(-h2 + wL / 2, yBase, hallZSouth, wL, FLOOR_H, WALL_T, mWall);
    }
    if (gx1 < h2 - 0.05) {
      const wR = h2 - gx1;
      addWall(gx1 + wR / 2, yBase, hallZSouth, wR, FLOOR_H, WALL_T, mWall);
    }
  } else {
    addWall(0, yBase, hallZSouth, hallLenLocal + WALL_T, FLOOR_H, WALL_T, mWall);
  }
  if (!omitEastCap) {
    addWall(h2 + WALL_T / 2, yBase, hallZ0, WALL_T, FLOOR_H, hallW + WALL_T, mWall);
  }
  addWall(-h2 - WALL_T / 2, yBase, hallZ0, WALL_T, FLOOR_H, hallW + WALL_T, mWall);

  addBaseboardAlongZ(-h2 + 0.2, hallZ0, hallW, yBase, hallLenLocal, 1);
  addBaseboardAlongZ(h2 - 0.2, hallZ0, hallW, yBase, hallLenLocal, -1);
  addBaseboardAlongX(0, hallZSouth + 0.2, hallLenLocal, yBase, WALL_T, 1);
  addBaseboardAlongX(0, hallZNorth - 0.2, hallLenLocal, yBase, WALL_T, -1);

  /** Bridge classroom → hall so raycasts never miss the seam. */
  const bridgeDepth = 0.55;
  const bridgeZ = hallSouthEdge - bridgeDepth * 0.5 + 0.02;
  addFloorSlab(0, bridgeZ, classW + 1.2, bridgeDepth, yBase, mFloorClass);
  if (cutClassDoorGap) {
    addCeiling(0, bridgeZ, classW + 1.6, bridgeDepth + 0.35, yBase + FLOOR_H, mCeiling, 0.22);
  }
}

buildCorridorShell(0, hallLen, true, true);

const sideRoomXs = [-32, -11, 11, 32];

function buildFullNorthClassroom(cx, yBase) {
  const floorCz = hallZNorth + classD / 2;
  const zBack = hallZNorth + classD + WALL_T / 2;
  /** Same plane as hall north wall — shared wall, door opening cut in the hall. */
  const zDoor = hallZNorth;
  addFloorSlab(cx, floorCz, classW + 0.4, classD + 0.35, yBase, mFloorClass);
  const classSouthEdge = floorCz - (classD + 0.35) * 0.5;
  const doorGapZ = classSouthEdge - hallNorthEdge;
  if (doorGapZ > 0.02) {
    const bridgeDepth = doorGapZ + 0.4;
    const bridgeZ = hallNorthEdge + bridgeDepth * 0.5 - 0.05;
    addFloorSlab(cx, bridgeZ, classW + 0.8, bridgeDepth, yBase, mFloorClass);
  }
  addCeiling(cx, floorCz, classW + 0.5, classD + 0.5, yBase + FLOOR_H, mCeiling);

  addWall(cx, yBase, zBack, classW + WALL_T, FLOOR_H, WALL_T, mWall);
  {
    const sideZ0 = hallZNorth;
    const sideZ1 = zBack;
    const sideDepth = sideZ1 - sideZ0;
    const sideCz = (sideZ0 + sideZ1) / 2;
    addWall(cx - classW / 2 - WALL_T / 2, yBase, sideCz, WALL_T, FLOOR_H, sideDepth, mWall);
    addWall(cx + classW / 2 + WALL_T / 2, yBase, sideCz, WALL_T, FLOOR_H, sideDepth, mWall);
  }

  /** Hall north wall already has the door-sized opening; classroom only adds lintel + door. */
  addDoorLintel(cx, zDoor, yBase, doorOpenW, WALL_T);

  const nb = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.32, 0.12), mChalk);
  nb.position.set(cx - 1.8, yBase + 1.42, zBack - 0.32);
  nb.castShadow = true;
  scene.add(nb);

  addClassroomFurniture(cx, floorCz, yBase, false);
  makeWindowBay(cx - 3, zBack - 0.12, 0, yBase);
  makeWindowBay(cx + 3.2, zBack - 0.12, 0, yBase);

  createSwingDoor({
    name: `nclass-${cx}-${yBase}`,
    hingeX: cx - doorGapHalf,
    hingeY: yBase,
    hingeZ: zDoor + 0.02,
    width: classSwingDoorW,
    height: classSwingDoorH,
    depth: classSwingDoorDepth,
    closedAngle: 0,
    openAngle: -1.05,
    blocksWhenClosed: true,
    startOpen: false,
  });
}

function buildNorthSideRooms(yBase) {
  const h2 = hallLen / 2;
  const openings = sideRoomXs
    .map((cx) => ({ lo: cx - doorGapHalf, hi: cx + doorGapHalf }))
    .concat([
      { lo: stairXWest - stairGapHalf, hi: stairXWest + stairGapHalf },
      { lo: stairX - stairGapHalf, hi: stairX + stairGapHalf },
    ])
    .sort((a, b) => a.lo - b.lo);
  let cursor = -h2;
  const innerR = h2;
  for (const op of openings) {
    if (op.lo > cursor + 0.02) {
      addWall((cursor + op.lo) / 2, yBase, hallZNorth, op.lo - cursor, FLOOR_H, WALL_T, mWall);
    }
    cursor = Math.max(cursor, op.hi);
  }
  if (innerR > cursor + 0.02) {
    addWall((cursor + innerR) / 2, yBase, hallZNorth, innerR - cursor, FLOOR_H, WALL_T, mWall);
  }
  for (const cx of sideRoomXs) {
    buildFullNorthClassroom(cx, yBase);
  }
  for (let i = -6; i <= 6; i += 2) {
    if (Math.abs(i * 3.8) < 14) continue;
    makeWindowBay(i * 3.8, hallZNorth - 0.06, 0, yBase);
  }
}

buildNorthSideRooms(0);

const h2 = hallLen / 2;
const eastX = h2 + WALL_T / 2;
const gapHalf = 0.58;
addWall(eastX, 0, (hallZSouth + hallZ0 - gapHalf) / 2, WALL_T, FLOOR_H, hallZ0 - gapHalf - hallZSouth + 0.05, mWall);
addWall(eastX, 0, (hallZ0 + gapHalf + hallZNorth) / 2, WALL_T, FLOOR_H, hallZNorth - hallZ0 - gapHalf + 0.05, mWall);
addWall(eastX, 2.15, hallZ0, gapHalf * 2 + 0.15, 1.05, WALL_T, mTrim);
createSwingDoor({
  name: "streetExit",
  hingeX: eastX - 0.38,
  hingeY: 0,
  hingeZ: hallZ0 - gapHalf + 0.04,
  width: 0.9,
  height: 2.02,
  depth: 0.08,
  closedAngle: 0,
  openAngle: -1.05,
  blocksWhenClosed: true,
  startOpen: false,
});
addFloorSlab(h2 + 5.5, hallZ0, 12, hallW + 2.5, 0, mFloorHall);

/** Floor 2: full south wall (no start-classroom door hole into the void). */
buildCorridorShell(FLOOR_H, hallLen, true, false);
buildNorthSideRooms(FLOOR_H);

addWall(eastX, FLOOR_H, (hallZSouth + hallZ0 - gapHalf) / 2, WALL_T, FLOOR_H, hallZ0 - gapHalf - hallZSouth + 0.05, mWall);
addWall(eastX, FLOOR_H, (hallZ0 + gapHalf + hallZNorth) / 2, WALL_T, FLOOR_H, hallZNorth - hallZ0 - gapHalf + 0.05, mWall);
addWall(eastX, FLOOR_H + 2.15, hallZ0, gapHalf * 2 + 0.15, 1.05, WALL_T, mTrim);
createSwingDoor({
  name: "streetExit2",
  hingeX: eastX - 0.38,
  hingeY: FLOOR_H,
  hingeZ: hallZ0 - gapHalf + 0.04,
  width: 0.9,
  height: 2.02,
  depth: 0.08,
  closedAngle: 0,
  openAngle: -1.05,
  blocksWhenClosed: true,
  startOpen: false,
});
addFloorSlab(h2 + 5.5, hallZ0, 12, hallW + 2.5, FLOOR_H, mFloorHall);

const steps = 16;

function addStairCorridorLandings(yBase, atX) {
  const zEnd = stairStartZ + 0.42;
  const depth = zEnd - hallNorthEdge + 0.25;
  if (depth < 0.2) return;
  const zMid = (hallNorthEdge + zEnd) * 0.5;
  addFloorSlab(atX, zMid, stairStepW + 2.4, depth, yBase, mFloorHall);
}

function addStairMarkers(yBase, atX) {
  const mMark = new THREE.MeshStandardMaterial({
    color: 0xf0d060,
    emissive: 0x4a3808,
    emissiveIntensity: 0.45,
    roughness: 0.5,
  });
  for (const sx of [atX - stairGapHalf + 0.32, atX + stairGapHalf - 0.32]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.18), mMark);
    post.position.set(sx, yBase + 1.05, hallZNorth + 0.08);
    post.castShadow = true;
    scene.add(post);
  }
}

/** Bright floor strip so “hall end → stairs north” reads from the corridor. */
function addStairEndFloorStrip(yBase, atX) {
  addFloorSlab(atX, hallZ0 - 0.28, stairGapHalf * 2 + 3.4, hallW * 0.98, yBase, mStairTread, 0.15);
}

function buildStairFlight(y0, y1, x, zStart) {
  const n = Math.max(8, Math.round((y1 - y0) / 0.26));
  const dh = (y1 - y0) / n;
  const dd = stairStepD;
  for (let s = 0; s < n; s++) {
    const y = y0 + s * dh;
    const z = zStart + s * dd;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(stairStepW, 0.2, dd + 0.04), mStairTread);
    tread.position.set(x, y + 0.1, z);
    tread.receiveShadow = true;
    tread.userData.walkSurface = true;
    tread.userData.isFloorSlab = true;
    scene.add(tread);
    walkSurfaces.push(tread);
    floorWalkSurfaces.push(tread);
    addWall(x - stairStepW / 2 - 0.12, y, z, 0.22, dh + 0.5, dd + 0.12, mTrim);
    addWall(x + stairStepW / 2 + 0.12, y, z, 0.22, dh + 0.5, dd + 0.12, mTrim);
  }
  addWall(x, y0, zStart - 0.35, stairStepW + 0.5, FLOOR_H, 0.35, mWall);
}

/** Downward run from yTop to yBottom, z from zHigh to zLow (zHigh > zLow, stepping −Z). */
function buildStairFlightDescendBetween(yTop, yBottom, x, zHigh, zLow) {
  const n = Math.max(10, Math.round((yTop - yBottom) / 0.24));
  const dh = (yTop - yBottom) / n;
  const span = zHigh - zLow;
  const dd = span / Math.max(1, n - 1);
  for (let s = 0; s < n; s++) {
    const y = yBottom + (n - 1 - s) * dh;
    const z = zHigh - s * dd;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(stairStepW, 0.2, dd + 0.06), mStairTread);
    tread.position.set(x, y + 0.1, z);
    tread.receiveShadow = true;
    tread.userData.walkSurface = true;
    tread.userData.isFloorSlab = true;
    scene.add(tread);
    walkSurfaces.push(tread);
    floorWalkSurfaces.push(tread);
    addWall(x - stairStepW / 2 - 0.12, y, z, 0.22, dh + 0.5, dd + 0.14, mTrim);
    addWall(x + stairStepW / 2 + 0.12, y, z, 0.22, dh + 0.5, dd + 0.14, mTrim);
  }
  addWall(x, yBottom, zLow - 0.35, stairStepW + 0.5, FLOOR_H, 0.35, mWall);
}

buildStairFlight(0, FLOOR_H, stairX, stairStartZ);
addStairCorridorLandings(0, stairX);
addStairMarkers(0, stairX);
addStairEndFloorStrip(0, stairX);
buildStairFlight(0, FLOOR_H, stairXWest, stairStartZ);
addStairCorridorLandings(0, stairXWest);
addStairMarkers(0, stairXWest);
addStairEndFloorStrip(0, stairXWest);

buildStairFlight(FLOOR_H, FLOOR_H * 2, stairX, stairStartZ);
addStairCorridorLandings(FLOOR_H, stairX);
addStairMarkers(FLOOR_H, stairX);
addStairEndFloorStrip(FLOOR_H, stairX);
buildStairFlight(FLOOR_H, FLOOR_H * 2, stairXWest, stairStartZ);
addStairCorridorLandings(FLOOR_H, stairXWest);
addStairMarkers(FLOOR_H, stairXWest);
addStairEndFloorStrip(FLOOR_H, stairXWest);

const roofY = FLOOR_H * 2;
const roofSlabZ = stairStartZ + steps * stairStepD + 5;
const roofSlabHalfW = 16;
const roofSlabHalfD = 12;
function addRoofTower(atX) {
  addFloorSlab(atX, roofSlabZ, roofSlabHalfW * 2 + 2, roofSlabHalfD * 2 + 2, roofY, mFloorRoof, 0.42);
  for (const [dx, dz, w, d] of [
    [0, roofSlabHalfD + 0.85, roofSlabHalfW * 2 + 4, 0.5],
    [0, -roofSlabHalfD - 0.85, roofSlabHalfW * 2 + 4, 0.5],
    [-roofSlabHalfW - 0.85, 0, 0.5, roofSlabHalfD * 2 + 4],
    [roofSlabHalfW + 0.85, 0, 0.5, roofSlabHalfD * 2 + 4],
  ]) {
    addWall(atX + dx, roofY, roofSlabZ + dz, w, 0.75, d, mTrim);
  }
}
addRoofTower(stairX);
addRoofTower(stairXWest);
const roofAccess = new THREE.Vector3(stairX, roofY + 0.25, roofSlabZ);

function nearRoofSlab(px, pz, marginW, marginD) {
  const ok = (rx, rz) =>
    Math.abs(px - rx) < roofSlabHalfW + marginW && Math.abs(pz - rz) < roofSlabHalfD + marginD;
  return ok(stairX, roofSlabZ) || ok(stairXWest, roofSlabZ);
}

const nStairSeg = Math.max(8, Math.round(FLOOR_H / 0.26));
const zStairTopLanding = stairStartZ + (nStairSeg - 1) * stairStepD;
const zRoofStairHigh = roofSlabZ + roofSlabHalfD - 0.55;
buildStairFlightDescendBetween(roofY, FLOOR_H, stairX + 3.35, zRoofStairHigh, zStairTopLanding);
buildStairFlightDescendBetween(roofY, FLOOR_H, stairXWest - 3.35, zRoofStairHigh, zStairTopLanding);
const zHallDownLow = hallZ0 + 0.12;
const zHallDownHigh = zHallDownLow + (nStairSeg - 1) * stairStepD;
buildStairFlightDescendBetween(FLOOR_H, 0, stairX + 5.85, zHallDownHigh, zHallDownLow);
buildStairFlightDescendBetween(FLOOR_H, 0, stairXWest - 5.85, zHallDownHigh, zHallDownLow);

const skyTopColor = new THREE.Color(0x6ec0ff);
const skyHorizonColor = new THREE.Color(0xb8e0ff);

const basementX = -hallLen / 2 + 4;
const bz0 = hallZ0;
for (let s = 0; s < 14; s++) {
  const y = -s * 0.3;
  const z = bz0 - 5 - s * 0.42;
  const tread = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 0.48), mFloorBasement);
  tread.position.set(basementX, y + 0.08, z);
  tread.userData.walkSurface = true;
  tread.userData.isFloorSlab = true;
  scene.add(tread);
  walkSurfaces.push(tread);
  floorWalkSurfaces.push(tread);
  addWall(basementX - 1.48, y, z, 0.2, 0.52, 0.5, mTrim);
  addWall(basementX + 1.48, y, z, 0.2, 0.52, 0.5, mTrim);
}
const basementFloorY = -4.2;
const bmz = bz0 - 10.5;
const lastStairZ = bz0 - 5 - 13 * 0.42;
addFloorSlab(basementX, (lastStairZ + bmz) / 2, 6, Math.abs(lastStairZ - bmz) + 2.5, basementFloorY, mFloorBasement, 0.24);
addFloorSlab(basementX, bmz + 2, 24, 16, basementFloorY, mFloorBasement);
const bh = FLOOR_H * 0.82;
const mazeW = (x, z, w, d) => addWall(x, basementFloorY, z, w, bh, d, mWall);
mazeW(basementX - 2, bmz + 1, 13, 0.32);
mazeW(basementX + 5, bmz + 5, 0.32, 9);
mazeW(basementX - 6, bmz + 7, 12, 0.32);
mazeW(basementX + 1, bmz - 3, 0.32, 7);
mazeW(basementX - 7, bmz - 1, 0.32, 8);
addWall(basementX, basementFloorY, bmz - 7, 22, FLOOR_H, 0.42, mWall);
addWall(basementX - 11, basementFloorY, bmz + 2, 0.42, FLOOR_H, 14, mWall);
addWall(basementX + 7, basementFloorY, bmz + 2, 0.42, FLOOR_H, 10, mWall);
const basementExitPos = new THREE.Vector3(basementX + 9.5, basementFloorY, bmz + 8);

const classDoorHingeX = classDoorCenterX - doorGapHalf;
const classDoorZ = classFrontZ + 0.02;
createSwingDoor({
  name: "classroom",
  hingeX: classDoorHingeX,
  hingeY: 0,
  hingeZ: classDoorZ,
  width: classSwingDoorW,
  height: classSwingDoorH,
  depth: classSwingDoorDepth,
  closedAngle: 0,
  openAngle: 1.05,
  blocksWhenClosed: true,
  startOpen: false,
});

const lockers = [];
function addLocker(x, y, z) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.95, 0.48), mMetal);
  body.position.set(x, y + 0.98, z);
  body.castShadow = true;
  scene.add(body);
  lockers.push({ pos: new THREE.Vector3(x, y, z), mesh: body });
}
addLocker(-hallLen / 2 + 2.8, 0, hallZ0 - 0.95);
addLocker(-hallLen / 2 + 3.55, 0, hallZ0 - 0.95);
addLocker(-hallLen / 2 + 4.3, 0, hallZ0 - 0.95);
addLocker(hallLen / 2 - 12, 0, hallZ0 + 0.9);
addLocker(-28, FLOOR_H, hallZ0 - 0.95);
addLocker(28, FLOOR_H, hallZ0 + 0.9);

const EYE_HEIGHT = 1.42;
const player = {
  pos: new THREE.Vector3(2, 0, 0),
  vel: new THREE.Vector3(),
  onGround: true,
  radius: 0.35,
  height: 1.65,
  hiding: false,
  yaw: Math.PI,
  pitch: 0.07,
};

const TEACHER_BOARD_YAW = Math.PI;
const teacherStart = new THREE.Vector3(-1.8, 0, -classD / 2 + 1.85);
const teacher = {
  pos: teacherStart.clone(),
  speed: 3.45,
  chase: false,
  visualYaw: TEACHER_BOARD_YAW,
  moveDelay: 0,
  knockPhase: 0,
};

const teacherParts = buildTeacherFemale();
const teacherRoot = teacherParts.root;
scene.add(teacherRoot);
teacherParts.setRage(false);

let teacherBobPhase = 0;
let teacherPrevPos = new THREE.Vector3();

const armsVm = buildPlayerArmsViewmodel();
camera.add(armsVm.root);

let gameState = "lesson";
let lastTeacherSee = 0;
let classDoorTriggered = false;
/** Only true after standing on the roof slab — avoids “fell off roof” while on ground / floor 2. */
let wasOnRoof = false;

const interactRay = new THREE.Raycaster();
const tmpV = new THREE.Vector3();

function tryInteract() {
  if (gameState === "win" || gameState === "caught") return;
  const origin = new THREE.Vector3(player.pos.x, player.pos.y + EYE_HEIGHT, player.pos.z);
  camera.getWorldDirection(tmpV);
  tmpV.normalize();
  interactRay.set(origin, tmpV);
  const hits = interactRay.intersectObjects(interactDoorMeshes, false);
  if (hits.length > 0 && hits[0].distance < 3.4) {
    const door = hits[0].object.userData.swingDoorRef;
    if (door) {
      const wasClosed = door.closed;
      door.closed = !door.closed;
      door.targetAngle = door.closed ? door.closedAngle : door.openAngle;
      if (door.name === "classroom" && wasClosed && !door.closed && !classDoorTriggered) {
        classDoorTriggered = true;
        teacherParts.setRage(true);
        teacher.moveDelay = 3;
        teacher.chase = false;
        gameState = "chase";
      }
      return;
    }
  }
  for (const door of doors) {
    const h = door.group.position;
    const p = player.pos;
    if (Math.hypot(p.x - h.x, p.z - h.z) < 2.4 && Math.abs(p.y - h.y) < 2.8) {
      const wasClosed = door.closed;
      door.closed = !door.closed;
      door.targetAngle = door.closed ? door.closedAngle : door.openAngle;
      if (door.name === "classroom" && wasClosed && !door.closed && !classDoorTriggered) {
        classDoorTriggered = true;
        teacherParts.setRage(true);
        teacher.moveDelay = 3;
        teacher.chase = false;
        gameState = "chase";
      }
      return;
    }
  }
  for (const L of lockers) {
    if (player.pos.distanceTo(L.pos) < 1.5 && Math.abs(player.pos.y - L.pos.y) < 2.2) {
      player.hiding = !player.hiding;
      armsVm.root.visible = !player.hiding;
      return;
    }
  }
}

function resolveHorizontalMove(origin, delta) {
  const r = player.radius;
  let ox = origin.x;
  let oz = origin.z;
  let dx = delta.x;
  let dz = delta.z;
  for (let i = 0; i < 4; i++) {
    tryMoveAxis("x", ox, oz, dx, r, (v) => {
      ox += v;
      dx = 0;
    });
    tryMoveAxis("z", ox, oz, dz, r, (v) => {
      oz += v;
      dz = 0;
    });
  }
  return new THREE.Vector3(ox, origin.y, oz);
}

function tryMoveAxis(axis, ox, oz, delta, r, apply) {
  if (Math.abs(delta) < 1e-6) return;
  const sign = Math.sign(delta);
  const step = Math.min(Math.abs(delta), 0.08) * sign;
  const nx = axis === "x" ? ox + step : ox;
  const nz = axis === "z" ? oz + step : oz;
  const minY = player.pos.y;
  const maxY = player.pos.y + player.height;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(nx - r, minY, nz - r),
    new THREE.Vector3(nx + r, maxY, nz + r)
  );
  for (const b of wallBoxes) {
    if (playerBox.intersectsBox(b)) return;
  }
  for (const b of doorColliders.values()) {
    if (playerBox.intersectsBox(b)) return;
  }
  apply(step);
}

const downRay = new THREE.Raycaster();

function groundHeightAt(x, z, yGuess) {
  const castFrom = (yTop) => {
    downRay.set(new THREE.Vector3(x, yTop, z), new THREE.Vector3(0, -1, 0));
    let best = -1e9;
    for (const h of downRay.intersectObjects(floorWalkSurfaces, false)) {
      if (h.point.y > best) best = h.point.y;
    }
    return best;
  };
  let best = castFrom(Math.max(80, yGuess + 40));
  if (best < -1e8) best = castFrom(220);
  if (best < -1e8) {
    const inStartDoorWedge =
      Math.abs(x - classDoorCenterX) < doorGapHalf + 1.2 &&
      z > classFrontZ - 0.55 &&
      z < hallSouthEdge + 0.55;
    if (inStartDoorWedge) {
      if (yGuess < FLOOR_H * 0.42) return 0.22;
      if (yGuess > FLOOR_H * 0.58 && yGuess < FLOOR_H * 1.85) return FLOOR_H + 0.22;
    }
  }
  return best;
}

const clock = new THREE.Clock();

function syncTeacherRig(dt) {
  const tMoved = teacherPrevPos.distanceToSquared(teacher.pos) > 1e-8;
  teacherPrevPos.copy(teacher.pos);
  const chasing = teacher.chase;
  teacherBobPhase += dt * (chasing && tMoved ? 12 : 1.8);
  const tbob = Math.sin(teacherBobPhase) * (chasing && tMoved ? 0.036 : 0.006);
  teacherRoot.position.set(teacher.pos.x, teacher.pos.y + tbob, teacher.pos.z);

  let targetYaw;
  if (!teacher.chase) {
    targetYaw = TEACHER_BOARD_YAW;
  } else {
    targetYaw = Math.atan2(player.pos.x - teacher.pos.x, player.pos.z - teacher.pos.z);
  }
  const turnSpd = 5.5 * dt;
  let dy = targetYaw - teacher.visualYaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  teacher.visualYaw += Math.sign(dy) * Math.min(Math.abs(dy), turnSpd);
  teacherRoot.rotation.y = teacher.visualYaw;

  const isKnocking = teacher.knockPhase > 0.14;
  const swing = chasing && tMoved && !isKnocking ? Math.sin(teacherBobPhase * 1.05) * 0.52 : 0;
  if (isKnocking) {
    const k = Math.sin(clock.elapsedTime * 15) * 0.58;
    teacherParts.armLU.rotation.x = 0.18 + k * 0.3;
    teacherParts.armRU.rotation.x = -0.52 - k;
    teacherParts.legL.rotation.x = -0.05;
    teacherParts.legR.rotation.x = 0.05;
  } else {
    teacherParts.armLU.rotation.x = swing;
    teacherParts.armRU.rotation.x = -swing;
    teacherParts.legL.rotation.x = -swing * 0.22;
    teacherParts.legR.rotation.x = swing * 0.22;
  }
}

function teacherNearClosedDoor() {
  for (const door of doors) {
    if (!door.closed) continue;
    const h = door.group.position;
    if (Math.abs(teacher.pos.y - h.y) > 2.8) continue;
    if (Math.hypot(teacher.pos.x - h.x, teacher.pos.z - h.z) < 2.85) return true;
  }
  return false;
}

/** No grab in the start room until she’s actually out in the hall (still chases you inside). */
function teacherExitedStartClassroom() {
  if (Math.abs(teacher.pos.y) > 1.05) return true;
  if (Math.abs(teacher.pos.x) > classW / 2 + 0.22) return true;
  if (teacher.pos.z > classFrontZ + 0.52) return true;
  return false;
}

function update(dt) {
  updateDoorAnimations(dt);

  if (gameState === "win" || gameState === "caught") return;

  if (gameState === "chase" && teacher.moveDelay > 0) {
    teacher.moveDelay -= dt;
    if (teacher.moveDelay <= 0) {
      teacher.moveDelay = 0;
      teacher.chase = true;
    }
  }

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
  forward.normalize();
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();

  const wish = new THREE.Vector3();
  if (KEYS["KeyW"] || KEYS["ArrowUp"]) wish.add(forward);
  if (KEYS["KeyS"] || KEYS["ArrowDown"]) wish.sub(forward);
  if (KEYS["KeyD"] || KEYS["ArrowRight"]) wish.add(right);
  if (KEYS["KeyA"] || KEYS["ArrowLeft"]) wish.sub(right);
  if (wish.lengthSq() > 0) {
    wish.normalize();
    const spd = (KEYS["ShiftLeft"] ? 7.2 : 5.2) * (player.hiding ? 0 : 1);
    wish.multiplyScalar(spd * dt);
    const next = resolveHorizontalMove(player.pos, new THREE.Vector3(wish.x, 0, wish.z));
    player.pos.x = next.x;
    player.pos.z = next.z;
  }

  if (KEYS["Space"] && player.onGround && !player.hiding) {
    player.vel.y = 8.5;
    player.onGround = false;
  }
  player.vel.y -= 22 * dt;
  player.pos.y += player.vel.y * dt;
  const gh = groundHeightAt(player.pos.x, player.pos.z, player.pos.y + 2);
  if (player.pos.y <= gh + 0.02) {
    player.pos.y = gh + 0.02;
    player.vel.y = 0;
    player.onGround = true;
  }

  const onRoofSlab = nearRoofSlab(player.pos.x, player.pos.z, 0.95, 0.95);
  if (player.onGround && player.pos.y > roofY + 0.06 && onRoofSlab) {
    wasOnRoof = true;
  }
  if (player.onGround && player.pos.y < roofY - 1.4) {
    wasOnRoof = false;
  }

  if (teacher.chase && !player.hiding) {
    lastTeacherSee = performance.now();
    let tx = player.pos.x;
    let tz = player.pos.z;
    if (Math.abs(teacher.pos.y) < 1.2 && !teacherExitedStartClassroom() && gameState === "chase") {
      const dx = CLASS_EXIT_X - teacher.pos.x;
      const dz = CLASS_EXIT_Z - teacher.pos.z;
      if (dx * dx + dz * dz > 0.38) {
        tx = CLASS_EXIT_X;
        tz = CLASS_EXIT_Z;
      }
    }
    tmpV.set(tx - teacher.pos.x, 0, tz - teacher.pos.z);
    if (tmpV.lengthSq() > 0.01) {
      tmpV.normalize().multiplyScalar(teacher.speed * (Math.abs(teacher.pos.y) < 1.2 && !teacherExitedStartClassroom() ? 1.12 : 1) * dt);
      const ptx = teacher.pos.x;
      const ptz = teacher.pos.z;
      const subSteps = 6;
      const mx = tmpV.x / subSteps;
      const mz = tmpV.z / subSteps;
      for (let si = 0; si < subSteps; si++) {
        tmpV.set(mx, 0, mz);
        teacher.pos.copy(resolveTeacherMove(teacher.pos, tmpV));
      }
      const moved = Math.hypot(teacher.pos.x - ptx, teacher.pos.z - ptz) > 0.007;
      const distP = new THREE.Vector2(player.pos.x, player.pos.z).distanceTo(new THREE.Vector2(teacher.pos.x, teacher.pos.z));
      if (!moved && distP > 1.55 && teacherNearClosedDoor()) {
        teacher.knockPhase = Math.min(1, teacher.knockPhase + dt * 2.4);
      } else {
        teacher.knockPhase = Math.max(0, teacher.knockPhase - dt * 0.9);
      }
    }
  } else if (teacher.chase && player.hiding) {
    if (performance.now() - lastTeacherSee > 2500) {
      tmpV.set(-hallLen / 2 + 4, teacher.pos.y, hallZ0).sub(teacher.pos);
      tmpV.y = 0;
      if (tmpV.lengthSq() > 0.01) {
        tmpV.normalize().multiplyScalar(teacher.speed * 0.35 * dt);
        teacher.pos.copy(resolveTeacherMove(teacher.pos, tmpV));
      }
    }
    teacher.knockPhase = Math.max(0, teacher.knockPhase - dt * 1.2);
  }

  if (!teacher.chase) {
    teacher.knockPhase = Math.max(0, teacher.knockPhase - dt * 2);
  }

  const dist = new THREE.Vector2(player.pos.x, player.pos.z).distanceTo(new THREE.Vector2(teacher.pos.x, teacher.pos.z));
  if (
    teacher.chase &&
    !player.hiding &&
    dist < 1.12 &&
    Math.abs(player.pos.y - teacher.pos.y) < 2.2 &&
    teacherExitedStartClassroom()
  ) {
    gameState = "caught";
    endEl.textContent =
      "She caught you. She picks you up and marches you down the hall to the principal’s office.";
    endEl.classList.add("visible");
    document.exitPointerLock?.();
    return;
  }

  if (player.pos.y < -8) {
    gameState = "caught";
    endEl.textContent = "You fell.";
    endEl.classList.add("visible");
    document.exitPointerLock?.();
    return;
  }
  if (
    wasOnRoof &&
    !player.onGround &&
    player.pos.y < FLOOR_H - 0.15 &&
    player.pos.y > -2 &&
    nearRoofSlab(player.pos.x, player.pos.z, 5, 5)
  ) {
    gameState = "caught";
    endEl.textContent = "You fell off the roof.";
    endEl.classList.add("visible");
    document.exitPointerLock?.();
    return;
  }

  const hallZOk = player.pos.z > hallZSouth - 0.65 && player.pos.z < hallZNorth + 0.65;
  const streetExit =
    player.pos.x > h2 + 3 &&
    hallZOk &&
    (player.pos.y < FLOOR_H * 0.6 || (player.pos.y > FLOOR_H * 0.32 && player.pos.y < FLOOR_H * 1.28));
  const basementExit =
    new THREE.Vector2(player.pos.x, player.pos.z).distanceTo(new THREE.Vector2(basementExitPos.x, basementExitPos.z)) < 3 &&
    player.pos.y < -1.2 &&
    player.pos.y > -5.8;

  if (streetExit || basementExit) {
    gameState = "win";
    endEl.textContent = streetExit ? "You made it outside." : "You found the basement exit.";
    endEl.classList.add("visible");
    document.exitPointerLock?.();
  }
}

function resolveTeacherMove(origin, delta) {
  const r = 0.45;
  const h = 1.6;
  let ox = origin.x;
  let oz = origin.z;
  const tryAxis = (axis, d) => {
    if (Math.abs(d) < 1e-6) return;
    const sign = Math.sign(d);
    const step = Math.min(Math.abs(d), 0.1) * sign;
    const nx = axis === "x" ? ox + step : ox;
    const nz = axis === "z" ? oz + step : oz;
    const box = new THREE.Box3(
      new THREE.Vector3(nx - r, origin.y, nz - r),
      new THREE.Vector3(nx + r, origin.y + h, nz + r)
    );
    for (const b of wallBoxes) {
      if (box.intersectsBox(b)) return;
    }
    for (const b of doorColliders.values()) {
      if (box.intersectsBox(b)) return;
    }
    if (axis === "x") ox = nx;
    else oz = nz;
  };
  tryAxis("x", delta.x);
  tryAxis("z", delta.z);
  const gy = groundHeightAt(ox, oz, origin.y + 4);
  const yFeet = gy > -500 ? gy + 0.02 : Math.max(0.02, origin.y);
  return new THREE.Vector3(ox, yFeet, oz);
}

function updateCamera() {
  camera.position.set(player.pos.x, player.pos.y + EYE_HEIGHT, player.pos.z);
  camera.rotation.order = "YXZ";
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function hudText() {
  const lines = [
    gameState === "lesson"
      ? "Lesson — E opens the door, then run. She waits 3s, then comes out looking for you."
      : gameState === "chase"
        ? teacher.chase
          ? "She’s chasing! E — doors/lockers. Stairs: east & west ends of the hall → go north into the stairwell. Shift sprint."
          : "Run — wait 3s, then she leaves the room and searches (other classrooms too). Close doors — she’ll knock."
        : "",
    "WASD / arrows · mouse look · Space · E",
    `Floor: ${player.pos.y < -1 ? "Basement" : player.pos.y > roofY - 0.2 ? "Rooftop" : player.pos.y > FLOOR_H - 0.4 ? "Floor 2" : "Ground"}`,
  ];
  hud.textContent = lines.filter(Boolean).join("\n");
  promptEl.textContent =
    gameState === "win" || gameState === "caught"
      ? ""
      : player.hiding
        ? "E — leave locker"
        : "E — door / locker";
}

teacher.pos.y = groundHeightAt(teacher.pos.x, teacher.pos.z, 4) + 0.02;
teacher.visualYaw = TEACHER_BOARD_YAW;
teacherPrevPos.copy(teacher.pos);
player.pos.y = groundHeightAt(player.pos.x, player.pos.z, 4) + 0.02;
syncTeacherRig(0);

const defaultSceneBg = new THREE.Color(0x7a93a8);
const defaultFogColor = new THREE.Color(0x9eb0c2);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  syncTeacherRig(dt);
  updateCamera();

  const onRoofView = player.pos.y > roofY - 0.5 && nearRoofSlab(player.pos.x, player.pos.z, 1.5, 1.5);
  if (onRoofView) {
    scene.background.lerp(skyTopColor, 0.12);
    scene.fog.color.lerp(skyHorizonColor, 0.1);
    scene.fog.far = 260;
    scene.fog.near = 55;
  } else {
    scene.background.copy(defaultSceneBg);
    scene.fog.color.copy(defaultFogColor);
    scene.fog.far = 235;
    scene.fog.near = 72;
  }

  const moving =
    !player.hiding &&
    (KEYS["KeyW"] ||
      KEYS["KeyS"] ||
      KEYS["KeyA"] ||
      KEYS["KeyD"] ||
      KEYS["ArrowUp"] ||
      KEYS["ArrowDown"] ||
      KEYS["ArrowLeft"] ||
      KEYS["ArrowRight"]) &&
    (gameState === "lesson" || gameState === "chase");
  const t = clock.elapsedTime;
  let armBob = 0;
  if (moving && player.onGround) armBob = Math.sin(t * 15) * 0.12;
  else if (!player.onGround) armBob = Math.sin(t * 10) * 0.22;
  armsVm.foreL.rotation.x = armBob + (!player.onGround ? -0.35 : 0);
  armsVm.foreR.rotation.x = -armBob * 0.95 + (!player.onGround ? -0.28 : 0);
  armsVm.root.position.y = -0.18 + (moving && player.onGround ? Math.sin(t * 15) * 0.015 : 0);

  hudText();
  renderer.render(scene, camera);
}

const canvas = renderer.domElement;

function startPointerLock() {
  if (gameState === "win" || gameState === "caught") return;
  canvas.requestPointerLock?.();
}

function bindStartClick(el) {
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    startPointerLock();
  });
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") {
      e.preventDefault();
      startPointerLock();
    }
  });
}

bindStartClick(canvas);
bindStartClick(clickToPlayEl);

document.addEventListener("pointerlockchange", () => {
  if (clickToPlayEl) clickToPlayEl.classList.toggle("hidden", document.pointerLockElement === canvas);
});
document.addEventListener("pointerlockerror", () => {
  if (clickToPlayEl) clickToPlayEl.classList.remove("hidden");
});
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * MOUSE_SENS;
  player.pitch -= e.movementY * MOUSE_SENS;
  const lim = Math.PI / 2 - 0.12;
  player.pitch = Math.max(-lim * 0.55, Math.min(lim * 0.45, player.pitch));
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

animate();

/** Dev helpers for in-browser checks (teleport / look). */
window.__escape = {
  player,
  teacher,
  doors,
  wallBoxes,
  teleport(x, y, z, yaw) {
    player.pos.set(x, y, z);
    if (yaw != null) player.yaw = yaw;
    player.vel.set(0, 0, 0);
  },
  lookAtDoor() {
    player.pos.set(classDoorCenterX, 0.24, classFrontZ - 2.2);
    player.yaw = 0;
    player.pitch = 0;
  },
  lookHall() {
    player.pos.set(0, 0.24, hallZ0);
    player.yaw = Math.PI * 0.5;
    player.pitch = 0;
  },
};
