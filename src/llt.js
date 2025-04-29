// Helper Function to Calculate Motion Ratio
function calculateMotionRatio({ controlArmLength, shockMountDistance, shockAngle }) {
  const shockAngleRadians = (shockAngle * Math.PI) / 180; // Convert to radians
  const motionRatio = (shockMountDistance / controlArmLength) * Math.cos(shockAngleRadians);
  return motionRatio;
}

// Helper Function to Perform Deep Merge
function deepMerge(target, source) {
  for (let key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      source[key] = deepMerge(target[key], source[key]);
    }
  }
  return { ...target, ...source };
}

function Vehicle(options = {}) {
  const g = 32.174; // ft/s², gravitational constant

  // Default Vehicle Parameters
  const defaultVehicle = {
    // totalWeight and weightDistribution will be calculated from staticCornerWeights
    cgHeight: 13 / 12,        // Convert inches to feet
    trackWidthFront: 65 / 12, // Convert inches to feet
    trackWidthRear: 65 / 12,  // Convert inches to feet
    wheelbase: 107 / 12,      // Convert inches to feet

    // Static Corner Weights (lbs)
    staticCornerWeights: {
      LF: 600, // Left Front
      RF: 650, // Right Front
      LR: 650, // Left Rear
      RR: 700  // Right Rear
    }
  };

  // Merge options with default vehicle parameters
  const vehicle = deepMerge(defaultVehicle, options);

  // Calculate totalWeight and weightDistribution from staticCornerWeights
  const totalWeight =
    vehicle.staticCornerWeights.LF +
    vehicle.staticCornerWeights.RF +
    vehicle.staticCornerWeights.LR +
    vehicle.staticCornerWeights.RR;

  const frontAxleWeight =
    vehicle.staticCornerWeights.LF +
    vehicle.staticCornerWeights.RF;

  const weightDistribution = frontAxleWeight / totalWeight;

  vehicle.totalWeight = totalWeight;
  vehicle.weightDistribution = weightDistribution;

  // Transients object to store intermediate values
  const transients = {};

  // Front Suspension Parameters
  const defaultSuspensionFront = {
    springRateLeft: 275,       // lb/in
    springRateRight: 400,      // lb/in
    rollCenterHeight: 2.5 / 12, // Convert inches to feet

    // Geometry Inputs for Motion Ratios
    controlArmLeft: { controlArmLength: 15, shockMountDistance: 12.375, shockAngle: 21 },
    controlArmRight: { controlArmLength: 15, shockMountDistance: 12.375, shockAngle: 21 },

    arb: {
      outerDiameter: 1,      // inches
      innerDiameter: 0.75,   // inches
      barLength: 25.5,       // inches
      armLength: 9.5,        // inches
      shearModulus: 11.5e6,  // psi
    }
  };

  // Merge options with default front suspension parameters
  const suspensionFront = deepMerge(defaultSuspensionFront, options.suspensionFront || {});

  // Initialize motion ratios and stiffness
  suspensionFront.motionRatioLeft = null;
  suspensionFront.motionRatioRight = null;
  suspensionFront.arb.stiffness = null;

  // Attach methods to suspensionFront
  suspensionFront.calculateMotionRatios = function() {
    this.motionRatioLeft = calculateMotionRatio(this.controlArmLeft);
    this.motionRatioRight = calculateMotionRatio(this.controlArmRight);
    transients.motionRatioLeft = this.motionRatioLeft;
    transients.motionRatioRight = this.motionRatioRight;
  };

  suspensionFront.calculateARBStiffness = function() {
    // Calculate polar moment of inertia (in^4)
    const polarMoment =
      (Math.PI / 32) *
      (Math.pow(this.arb.outerDiameter, 4) - Math.pow(this.arb.innerDiameter, 4));

    // Torsional stiffness of the bar (lb-in/rad)
    const torsionalStiffness = (this.arb.shearModulus * polarMoment) / this.arb.barLength;

    // ARB Rate at the arm end (lb/in)
    const arbRate = torsionalStiffness / Math.pow(this.arb.armLength, 2);

    transients.frontARB = {
      polarMoment,
      torsionalStiffness,
      arbRate
    };

    this.arb.rate = arbRate; // lb/in at the arm end
  };

  // Rear Suspension Parameters
  const defaultSuspensionRear = {
    springRate: 200,           // lb/in
    rollCenterHeight: 6 / 12,  // Convert inches to feet
    motionRatio: 0.9,          // Predefined motion ratio
    trackWidth: vehicle.trackWidthRear
  };

  // Merge options with default rear suspension parameters
  const suspensionRear = deepMerge(defaultSuspensionRear, options.suspensionRear || {});

  const lateralAcceleration = options.lateralAcceleration || 2; // g

  // Computed Properties and Methods
  let mass;
  let totalLateralForce;
  let averageTrackWidth;
  let totalLLT;
  let frontRollStiffness;
  let rearRollStiffness;
  let totalRollStiffness;
  let frontGeometricLLT;
  let rearGeometricLLT;
  let elasticLLT;
  let frontElasticLLT;
  let rearElasticLLT;
  let frontLLT;
  let rearLLT;
  let frontSuspensionRollStiffness;
  let frontARBRollStiffness;
  let frontARBContributionPercentage;

  function calculateMass() {
    mass = vehicle.totalWeight / g; // Convert weight (lbs) to mass (slugs)
    transients.mass = mass;
  }

  function calculateTotalLateralForce() {
    totalLateralForce = vehicle.totalWeight * lateralAcceleration; // lbs
    transients.totalLateralForce = totalLateralForce;
  }

  function calculateAverageTrackWidth() {
    averageTrackWidth = (vehicle.trackWidthFront + vehicle.trackWidthRear) / 2;
    transients.averageTrackWidth = averageTrackWidth;
  }

  function calculateTotalLLT() {
    totalLLT = (totalLateralForce * vehicle.cgHeight) / averageTrackWidth; // lbs
    transients.totalLLT = totalLLT;
  }

  function calculateRollStiffness() {
    suspensionFront.calculateMotionRatios();

    // Wheel Rates in lb/in (Front)
    const wheelRateLeft =
      suspensionFront.springRateLeft * Math.pow(suspensionFront.motionRatioLeft, 2);

    const wheelRateRight =
      suspensionFront.springRateRight * Math.pow(suspensionFront.motionRatioRight, 2);

    const frontWheelRateAvg = (wheelRateLeft + wheelRateRight) / 2; // lb/in

    // ARB Wheel Rate in lb/in (Front)
    suspensionFront.calculateARBStiffness();
    const arbWheelRate =
      suspensionFront.arb.rate * Math.pow(suspensionFront.motionRatioLeft, 2);

    // Track Width in inches (Front)
    const trackWidthFront = vehicle.trackWidthFront * 12; // Convert ft to inches

    // Front Suspension Roll Stiffness (from springs)
    frontSuspensionRollStiffness =
      2 * frontWheelRateAvg * Math.pow(trackWidthFront / 2, 2); // lb-in/rad

    // Front ARB Roll Stiffness
    frontARBRollStiffness =
      2 * arbWheelRate * Math.pow(trackWidthFront / 2, 2); // lb-in/rad

    // Total Front Roll Stiffness
    frontRollStiffness = frontSuspensionRollStiffness + frontARBRollStiffness; // lb-in/rad

    // Convert to lb-ft/rad
    frontSuspensionRollStiffness /= 12;
    frontARBRollStiffness /= 12;
    frontRollStiffness /= 12;

    // Calculate ARB Contribution Percentage (Front)
    frontARBContributionPercentage = (frontARBRollStiffness / frontRollStiffness) * 100;

    // Rear Wheel Rate in lb/in
    const rearWheelRate =
      suspensionRear.springRate * Math.pow(suspensionRear.motionRatio, 2);

    // Rear Roll Stiffness
    const trackWidthRear = vehicle.trackWidthRear * 12; // Convert ft to inches
    rearRollStiffness =
      2 * rearWheelRate * Math.pow(trackWidthRear / 2, 2) / 12; // lb-ft/rad

    // Total Roll Stiffness
    totalRollStiffness = frontRollStiffness + rearRollStiffness;

    transients.rollStiffness = {
      wheelRateLeft,
      wheelRateRight,
      frontWheelRateAvg,
      arbWheelRate,
      frontSuspensionRollStiffness,
      frontARBRollStiffness,
      frontRollStiffness,
      frontARBContributionPercentage,
      rearWheelRate,
      rearRollStiffness,
      totalRollStiffness
    };
  }

  function calculateLLT() {
    calculateMass();
    calculateTotalLateralForce();
    calculateAverageTrackWidth();
    calculateTotalLLT();
    calculateRollStiffness();

    // Geometric LLT (Front & Rear)
    frontGeometricLLT = (totalLateralForce * suspensionFront.rollCenterHeight) / averageTrackWidth;
    rearGeometricLLT = (totalLateralForce * suspensionRear.rollCenterHeight) / averageTrackWidth;

    // Elastic LLT
    elasticLLT = totalLLT - frontGeometricLLT - rearGeometricLLT;

    // Distribute Elastic LLT based on Roll Stiffness
    frontElasticLLT = elasticLLT * (frontRollStiffness / totalRollStiffness);
    rearElasticLLT = elasticLLT * (rearRollStiffness / totalRollStiffness);

    // Total LLT at each axle
    frontLLT = frontGeometricLLT + frontElasticLLT;
    rearLLT = rearGeometricLLT + rearElasticLLT;

    transients.LLT = {
      frontGeometricLLT,
      rearGeometricLLT,
      elasticLLT,
      frontElasticLLT,
      rearElasticLLT,
      frontLLT,
      rearLLT,
      totalLLT
    };
  }

  function calculateDynamicWheelLoads() {
    calculateLLT();

    // Assuming left turn: load transfers from left to right wheels
    // Increase load on right wheels, decrease on left wheels
    const dynamicCornerWeights = {};

    // Front Axle
    const frontLeftDynamic = vehicle.staticCornerWeights.LF - (frontLLT / 2);
    const frontRightDynamic = vehicle.staticCornerWeights.RF + (frontLLT / 2);

    // Rear Axle
    const rearLeftDynamic = vehicle.staticCornerWeights.LR - (rearLLT / 2);
    const rearRightDynamic = vehicle.staticCornerWeights.RR + (rearLLT / 2);

    dynamicCornerWeights.LF = frontLeftDynamic;
    dynamicCornerWeights.RF = frontRightDynamic;
    dynamicCornerWeights.LR = rearLeftDynamic;
    dynamicCornerWeights.RR = rearRightDynamic;

    transients.dynamicCornerWeights = dynamicCornerWeights;

    return dynamicCornerWeights;
  }

  function displayDetails() {
    console.log('\n--- Transient Values ---\n');

    console.log(`Vehicle Total Weight: ${vehicle.totalWeight.toFixed(2)} lbs`);
    console.log(`Vehicle Weight Distribution (Front): ${(vehicle.weightDistribution * 100).toFixed(2)}%`);
    console.log(`Vehicle Mass: ${transients.mass.toFixed(4)} slugs`);
    console.log(`Total Lateral Force: ${vehicle.totalWeight.toFixed(2)} lbs * ${lateralAcceleration.toFixed(2)} g = ${transients.totalLateralForce.toFixed(2)} lbs`);
    console.log(`Average Track Width: (${vehicle.trackWidthFront.toFixed(4)} ft + ${vehicle.trackWidthRear.toFixed(4)} ft) / 2 = ${transients.averageTrackWidth.toFixed(4)} ft`);
    console.log(`Total Lateral Load Transfer (LLT): (Total Lateral Force * CG Height) / Average Track Width`);
    console.log(`= (${transients.totalLateralForce.toFixed(2)} lbs * ${vehicle.cgHeight.toFixed(4)} ft) / ${transients.averageTrackWidth.toFixed(4)} ft = ${transients.totalLLT.toFixed(2)} lbs`);

    console.log('\n--- Roll Stiffness ---');

    console.log(`Wheel Rate Left: ${transients.rollStiffness.wheelRateLeft.toFixed(2)} lb/in`);
    console.log(`Wheel Rate Right: ${transients.rollStiffness.wheelRateRight.toFixed(2)} lb/in`);
    console.log(`Front Wheel Rate Average: ${transients.rollStiffness.frontWheelRateAvg.toFixed(2)} lb/in`);
    console.log(`ARB Wheel Rate: ${transients.rollStiffness.arbWheelRate.toFixed(2)} lb/in`);

    console.log(`Front Suspension Roll Stiffness: ${transients.rollStiffness.frontSuspensionRollStiffness.toFixed(2)} lb-in/rad (before /12)`);
    console.log(`Front ARB Roll Stiffness: ${transients.rollStiffness.frontARBRollStiffness.toFixed(2)} lb-in/rad (before /12)`);
    console.log(`Front Roll Stiffness: ${transients.rollStiffness.frontRollStiffness.toFixed(2)} lb-ft/rad`);
    console.log(`Front ARB Contribution: ${transients.rollStiffness.frontARBContributionPercentage.toFixed(2)}%`);
    console.log(`Rear Wheel Rate: ${transients.rollStiffness.rearWheelRate.toFixed(2)} lb/in`);
    console.log(`Rear Roll Stiffness: ${transients.rollStiffness.rearRollStiffness.toFixed(2)} lb-ft/rad`);
    console.log(`Total Roll Stiffness: ${transients.rollStiffness.totalRollStiffness.toFixed(2)} lb-ft/rad`);

    console.log('\n--- LLT Components ---');
    console.log(`Front Geometric LLT: ${transients.LLT.frontGeometricLLT.toFixed(2)} lbs`);
    console.log(`Rear Geometric LLT: ${transients.LLT.rearGeometricLLT.toFixed(2)} lbs`);
    console.log(`Elastic LLT: ${transients.LLT.elasticLLT.toFixed(2)} lbs`);
    console.log(`Front Elastic LLT: ${transients.LLT.frontElasticLLT.toFixed(2)} lbs`);
    console.log(`Rear Elastic LLT: ${transients.LLT.rearElasticLLT.toFixed(2)} lbs`);
    console.log(`Front Total LLT: ${transients.LLT.frontLLT.toFixed(2)} lbs`);
    console.log(`Rear Total LLT: ${transients.LLT.rearLLT.toFixed(2)} lbs`);

    console.log('\n--- Dynamic Corner Weights ---');
    // Calculate total static and dynamic weights
    const totalStaticWeight = vehicle.totalWeight;
    const totalDynamicWeight = Object.values(transients.dynamicCornerWeights).reduce((a, b) => a + b, 0);

    console.log(`Wheel\tStatic (lbs)\t% Static\tDynamic (lbs)\t% Dynamic\tChange (lbs)\t% Change`);
    const wheels = ['LF', 'RF', 'LR', 'RR'];
    wheels.forEach(wheel => {
      const staticWeight = vehicle.staticCornerWeights[wheel];
      const dynamicWeight = transients.dynamicCornerWeights[wheel];
      const change = dynamicWeight - staticWeight;
      const staticPercentOfTotal = (staticWeight / totalStaticWeight) * 100;
      const dynamicPercentOfTotal = (dynamicWeight / totalDynamicWeight) * 100;
      const percentChange = dynamicPercentOfTotal - staticPercentOfTotal;
      console.log(`${wheel}\t${staticWeight.toFixed(2)}\t\t${staticPercentOfTotal.toFixed(2)}%\t\t${dynamicWeight.toFixed(2)}\t\t${dynamicPercentOfTotal.toFixed(2)}%\t\t${change >= 0 ? '+' : ''}${change.toFixed(2)}\t\t${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`);
    });

    // Subtotals have been removed from this section as per your request
  }

  function compareTo(otherVehicle) {
    // Ensure that both vehicles have calculated dynamic wheel loads
    if (!transients.dynamicCornerWeights) {
      calculateDynamicWheelLoads();
    }
    if (!otherVehicle.transients.dynamicCornerWeights) {
      otherVehicle.calculateDynamicWheelLoads();
    }

    // Calculate total dynamic weights
    const totalDynamicWeight1 = Object.values(transients.dynamicCornerWeights).reduce((a, b) => a + b, 0);
    const totalDynamicWeight2 = Object.values(otherVehicle.transients.dynamicCornerWeights).reduce((a, b) => a + b, 0);

    console.log('\n--- Dynamic Corner Weights Comparison ---');
    console.log(`Wheel\tVehicle 1 (lbs)\t% of Total\tVehicle 2 (lbs)\t% of Total\tDifference (lbs)`);
    const wheels = ['LF', 'RF', 'LR', 'RR'];
    wheels.forEach(wheel => {
      const weight1 = transients.dynamicCornerWeights[wheel];
      const weight2 = otherVehicle.transients.dynamicCornerWeights[wheel];
      const diff = weight2 - weight1;
      const percent1 = (weight1 / totalDynamicWeight1) * 100;
      const percent2 = (weight2 / totalDynamicWeight2) * 100;
      console.log(`${wheel}\t${weight1.toFixed(2)}\t\t${percent1.toFixed(2)}%\t\t${weight2.toFixed(2)}\t\t${percent2.toFixed(2)}%\t\t${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`);
    });

    // Calculate front and rear axle totals for both vehicles
    const frontAxle1 = transients.dynamicCornerWeights.LF + transients.dynamicCornerWeights.RF;
    const rearAxle1 = transients.dynamicCornerWeights.LR + transients.dynamicCornerWeights.RR;
    const frontPercent1 = (frontAxle1 / totalDynamicWeight1) * 100;
    const rearPercent1 = (rearAxle1 / totalDynamicWeight1) * 100;

    const frontAxle2 = otherVehicle.transients.dynamicCornerWeights.LF + otherVehicle.transients.dynamicCornerWeights.RF;
    const rearAxle2 = otherVehicle.transients.dynamicCornerWeights.LR + otherVehicle.transients.dynamicCornerWeights.RR;
    const frontPercent2 = (frontAxle2 / totalDynamicWeight2) * 100;
    const rearPercent2 = (rearAxle2 / totalDynamicWeight2) * 100;

    const frontDiff = frontAxle2 - frontAxle1;
    const rearDiff = rearAxle2 - rearAxle1;

    // Add subtotals for front and rear axles
    console.log(`\nAxle\tVehicle 1 (lbs)\t% of Total\tVehicle 2 (lbs)\t% of Total\tDifference (lbs)`);
    console.log(`Front\t${frontAxle1.toFixed(2)}\t\t${frontPercent1.toFixed(2)}%\t\t${frontAxle2.toFixed(2)}\t\t${frontPercent2.toFixed(2)}%\t\t${frontDiff >= 0 ? '+' : ''}${frontDiff.toFixed(2)}`);
    console.log(`Rear\t${rearAxle1.toFixed(2)}\t\t${rearPercent1.toFixed(2)}%\t\t${rearAxle2.toFixed(2)}\t\t${rearPercent2.toFixed(2)}%\t\t${rearDiff >= 0 ? '+' : ''}${rearDiff.toFixed(2)}`);
  }

  // Expose the transients object for access in compareTo
  // this.transients = transients;

  return {
    vehicle,
    suspensionFront,
    suspensionRear,
    lateralAcceleration,
    g, // Gravitational constant
    calculateDynamicWheelLoads,
    displayDetails,
    compareTo,
    transients
  };
}

// Usage Example

// Create the default vehicle
const car0 = Vehicle();
car0.calculateDynamicWheelLoads();
car0.displayDetails();

// Create another vehicle with modified parameters (for comparison)
const car1 = Vehicle({
  suspensionFront: {
    springRateLeft: 300,
    springRateRight: 300,
    arb: {
      outerDiameter: 1.125, // Increased ARB diameter
      innerDiameter: 0.75,
    }
  },
  staticCornerWeights: {
    LF: 610, // Left Front
    RF: 640, // Right Front
    LR: 660, // Left Rear
    RR: 690
  }
});
car1.calculateDynamicWheelLoads();

// Compare the two vehicles
car0.compareTo(car1);
