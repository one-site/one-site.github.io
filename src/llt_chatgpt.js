// Core vehicle dynamics and comparison logic
function Vehicle(overrides = {}) {
  const defaultVehicle = {
    totalWeight: 2600,
    weightDistribution: 0.48,
    cgHeight: 13 / 12,           // feet
    trackWidthFront: 65 / 12,    // feet
    trackWidthRear: 65 / 12,     // feet
    wheelbase: 107 / 12,         // feet
    staticCornerWeights: { LF: 600, RF: 650, LR: 650, RR: 700 }
  };

  const defaultSuspensionFront = {
    springRateLeft: 275,        // lb/in
    springRateRight: 400,       // lb/in
    rollCenterHeight: 2.5,      // inches
    controlArmLeft: { controlArmLength: 15, shockMountDistance: 12.375, shockAngle: 21 },
    controlArmRight: { controlArmLength: 15, shockMountDistance: 12.375, shockAngle: 21 },
    arb: { outerDiameter: 1, innerDiameter: 0.75, barLength: 25.5, armLength: 9.5, shearModulus: 11.5e6 }
  };

  const defaultSuspensionRear = {
    springRate: 200,            // lb/in
    rollCenterHeight: 6,        // inches
    springSpan: 50,             // inches
    motionRatio: 0.9
  };

  const g = 32.174;               // ft/s²
  const loadSensitivity = 0.90;   // linear sensitivity

  function calculateMotionRatio({ controlArmLength, shockMountDistance, shockAngle }) {
    const rad = (shockAngle * Math.PI) / 180;
    return (shockMountDistance / controlArmLength) * Math.cos(rad);
  }

  // Merge defaults and overrides, deep-merge ARB
  const vehicle = { ...defaultVehicle, ...overrides };
  const suspensionFront = {
    ...defaultSuspensionFront,
    ...overrides.suspensionFront,
    arb: {
      ...defaultSuspensionFront.arb,
      ...(overrides.suspensionFront?.arb || {})
    }
  };
  const suspensionRear = { ...defaultSuspensionRear, ...overrides.suspensionRear };

  const transients = {};

  return {
    vehicle,
    suspensionFront,
    suspensionRear,
    g,
    lateralAcceleration: 2,     // g's
    transients,

    // Derived properties
    get mass() { return this.vehicle.totalWeight / this.g; },
    get distanceToFrontAxle() { return this.vehicle.wheelbase * this.vehicle.weightDistribution; },
    get distanceToRearAxle() { return this.vehicle.wheelbase * (1 - this.vehicle.weightDistribution); },
    get totalLateralForce() { return this.vehicle.totalWeight * this.lateralAcceleration; },

    // Weight transfer
    weightTransferFront() {
      return (this.lateralAcceleration * this.vehicle.cgHeight * this.mass * this.distanceToRearAxle) / this.vehicle.wheelbase;
    },
    weightTransferRear() {
      return (this.lateralAcceleration * this.vehicle.cgHeight * this.mass * this.distanceToFrontAxle) / this.vehicle.wheelbase;
    },
    adjustedLateralForces() {
      const front = this.weightTransferFront() + (this.totalLateralForce * this.distanceToRearAxle / this.vehicle.wheelbase);
      const rear  = this.weightTransferRear()  + (this.totalLateralForce * this.distanceToFrontAxle / this.vehicle.wheelbase);
      return { frontLateralForce: front, rearLateralForce: rear };
    },

    // Lateral Load Transfer (LLT)
    calculateLLT() {
      const { frontLateralForce, rearLateralForce } = this.adjustedLateralForces();

      // Convert track widths to inches
      const ft_in = this.vehicle.trackWidthFront * 12;
      const rt_in = this.vehicle.trackWidthRear  * 12;
      const rcf_in = this.suspensionFront.rollCenterHeight;
      const rcr_in = this.suspensionRear.rollCenterHeight;

      // Geometric LLT (lbs)
      const frontGeometricLLT = (frontLateralForce * rcf_in) / ft_in;
      const rearGeometricLLT  = (rearLateralForce  * rcr_in) / rt_in;

      // Wheel rates (lb/in)
      const mrl = calculateMotionRatio(this.suspensionFront.controlArmLeft);
      const mrr = calculateMotionRatio(this.suspensionFront.controlArmRight);
      const wrL = this.suspensionFront.springRateLeft  * mrl ** 2;
      const wrR = this.suspensionFront.springRateRight * mrr ** 2;
      const springContributionFront = wrL + wrR;

      // ARB stiffness (lb/in)
      const arbStiffness = (() => {
        const { outerDiameter, innerDiameter, barLength, armLength, shearModulus } = this.suspensionFront.arb;
        const J = (Math.PI / 32) * (outerDiameter ** 4 - innerDiameter ** 4);
        const kT = (shearModulus * J) / barLength;
        return kT / (armLength ** 2);
      })();

      // Roll stiffness (lb-in/rad)
      const halfTrackFront = ft_in / 2;
      const springRollStiff = springContributionFront * halfTrackFront ** 2;
      const arbRollStiff    = arbStiffness        * halfTrackFront ** 2;
      const totalFrontRollStiff = springRollStiff + arbRollStiff;

      // Elastic LLT: leverage by CG height above RC (inches)
      const cg_in = this.vehicle.cgHeight * 12;
      const frontElasticLLT = (frontLateralForce * (cg_in - rcf_in)) / totalFrontRollStiff;

      // Rear roll stiffness and elastic LLT
      const halfTrackRear = rt_in / 2;
      const springRollStiffR = this.suspensionRear.springRate * (this.suspensionRear.motionRatio ** 2) * halfTrackRear ** 2;
      const totalRearRollStiff = springRollStiffR;
      const rearElasticLLT = (rearLateralForce * (cg_in - rcr_in)) / totalRearRollStiff;

      // Total LLT per axle
      const frontLLT = frontGeometricLLT + frontElasticLLT;
      const rearLLT  = rearGeometricLLT  + rearElasticLLT;

      // Save transients
      Object.assign(this.transients, {
        frontGeometricLLT,
        rearGeometricLLT,
        frontElasticLLT,
        rearElasticLLT,
        frontLLT,
        rearLLT,
        wheelRateLeft: wrL,
        wheelRateRight: wrR,
        rearWheelRate: this.suspensionRear.springRate * this.suspensionRear.motionRatio ** 2,
        frontRollStiffness: totalFrontRollStiff,
        rearRollStiffness: totalRearRollStiff,
        arbContribution: arbRollStiff / totalFrontRollStiff
      });

      return { frontGeometricLLT, rearGeometricLLT, frontElasticLLT, rearElasticLLT, frontLLT, rearLLT, totalLLT: frontLLT + rearLLT };
    },

    // Dynamic corner loads
    calculateDynamicWheelLoads() {
      const sw = this.vehicle.staticCornerWeights;
      const { frontLLT, rearLLT } = this.calculateLLT();
      const dyn = {
        LF: sw.LF - frontLLT/2,
        RF: sw.RF + frontLLT/2,
        LR: sw.LR - rearLLT/2,
        RR: sw.RR + rearLLT/2
      };
      this.transients.dynamicCornerWeights = dyn;
      return dyn;
    },

    // Display details with non-linear tire model
    getDisplayDetails() {
      const sw = this.vehicle.staticCornerWeights;
      const dyn = this.calculateDynamicWheelLoads();
      const totalStatic  = Object.values(sw).reduce((a,b)=>a+b,0);
      const totalDynamic = Object.values(dyn).reduce((a,b)=>a+b,0);

      const tireExponent = 0.85;
      const wheels = ["LF","RF","LR","RR"].map(w => {
        const s = sw[w], d = dyn[w], ch = d - s;
        const sp = (s / totalStatic) * 100;
        const dp = (d / totalDynamic) * 100;
        const ld = ch / s;
        const gd = ld * loadSensitivity * 100;
        const eg = Math.pow(d, tireExponent);
        return { wheel: w, static: s, dynamic: d, change: ch, staticPct: sp, dynamicPct: dp, gripDelta: gd, effectiveGrip: eg };
      });

      const frontGrip = wheels.find(w=>w.wheel==="LF").effectiveGrip + wheels.find(w=>w.wheel==="RF").effectiveGrip;
      const rearGrip  = wheels.find(w=>w.wheel==="LR").effectiveGrip + wheels.find(w=>w.wheel==="RR").effectiveGrip;

      const staticCross  = sw.RF + sw.LR;
      const dynamicCross = dyn.RF + dyn.LR;
      const staticWedge  = (staticCross  / totalStatic)  * 100;
      const dynamicWedge = (dynamicCross / totalDynamic) * 100;
      const wedgeChange  = dynamicWedge - staticWedge;

      return { wheels, totals: { totalStatic, totalDynamic }, frontGrip, rearGrip, staticWedge, dynamicWedge, wedgeChange };
    }
  };
}

// Example usage:
// const car = Vehicle();
// console.log(car.getDisplayDetails());

window.Vehicle = Vehicle
