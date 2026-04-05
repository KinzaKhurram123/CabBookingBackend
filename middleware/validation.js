const validatePetRide = (req, res, next) => {
  // Validation logic for pet rides
  next();
};

const validateParcelRide = (req, res, next) => {
  // Validation logic for parcel rides
  next();
};

module.exports = { validatePetRide, validateParcelRide };
