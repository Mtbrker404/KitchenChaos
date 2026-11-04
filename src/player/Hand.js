import * as THREE from 'three';

const skin = new THREE.MeshStandardMaterial({ color: 0xf2d2b0, roughness: 0.8, flatShading: true });
const glove = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.9, flatShading: true }); // chef's cuff

// finger: [y offset across the knuckle row, length of segment 1, segment 2, thickness]
const FINGERS = [
  [0.026, 0.032, 0.026, 0.017], // index
  [0.008, 0.035, 0.028, 0.018], // middle
  [-0.01, 0.033, 0.026, 0.017], // ring
  [-0.026, 0.026, 0.021, 0.015], // pinky
];

function seg(len, thick, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, len), skin);
  m.position.z = -len / 2;
  m.castShadow = true;
  parent.add(m);
  return m;
}

/**
 * Low-poly chef hand that lives in the controller's grip space
 * (-Z = forward, palm faces -X for the right hand; the left hand is mirrored).
 *
 *  - grip (squeeze) button  -> whole hand closes: this is the grab
 *  - trigger                -> index finger curls (menu clicking later)
 */
export class Hand {
  constructor(handedness) {
    this.handedness = handedness;
    this.root = new THREE.Group();
    this.root.name = `hand.${handedness}`;
    this.root.userData.noRaycast = true;
    if (handedness === 'left') this.root.scale.x = -1;

    // tilt so the hand sits naturally around the controller
    const hand = new THREE.Group();
    hand.position.set(0.012, -0.01, 0.045);
    hand.rotation.x = -0.35;
    this.root.add(hand);

    // palm + cuff
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.075, 0.085), skin);
    palm.castShadow = true;
    hand.add(palm);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.085, 0.05), glove);
    cuff.position.z = 0.065;
    hand.add(cuff);

    // fingers: each has two joints (knuckle + middle joint)
    this.fingers = FINGERS.map(([y, l1, l2, t]) => {
      const knuckle = new THREE.Group();
      knuckle.position.set(-0.002, y, -0.042);
      hand.add(knuckle);
      seg(l1, t, knuckle);
      const mid = new THREE.Group();
      mid.position.z = -l1;
      knuckle.add(mid);
      seg(l2, t * 0.92, mid);
      return { knuckle, mid };
    });

    // thumb: sits on top, points forward and towards the palm side
    this.thumb = new THREE.Group();
    this.thumb.position.set(-0.012, 0.03, -0.005);
    this.thumb.rotation.set(0.5, -0.5, 0);
    hand.add(this.thumb);
    seg(0.03, 0.019, this.thumb);
    this.thumbTip = new THREE.Group();
    this.thumbTip.position.z = -0.03;
    this.thumbTip.rotation.y = -0.2;
    this.thumb.add(this.thumbTip);
    seg(0.026, 0.017, this.thumbTip);

    // where things get held: just in front of the palm
    this.grabPoint = new THREE.Object3D();
    this.grabPoint.position.set(-0.045, 0, -0.03);
    hand.add(this.grabPoint);

    this.grip = 0; // 0 = open, 1 = fist (animated)
    this.index = 0;
  }

  /** Smoothly move towards the button values. `gripTarget` may be overridden while holding. */
  update(dt, gripTarget, triggerTarget) {
    const k = 1 - Math.exp(-25 * dt);
    this.grip += (gripTarget - this.grip) * k;
    this.index += (Math.max(triggerTarget, gripTarget) - this.index) * k;

    // curl = rotate around Y towards the palm (-X)
    this.fingers.forEach((f, i) => {
      const c = i === 0 ? this.index : this.grip;
      f.knuckle.rotation.y = c * 1.35;
      f.mid.rotation.y = c * 1.5;
    });
    this.thumb.rotation.set(0.5 - this.grip * 0.3, -0.5 - this.grip * 0.6, 0);
    this.thumbTip.rotation.y = -0.2 - this.grip * 0.8;
  }
}
