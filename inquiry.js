"use strict";

const phonePattern = /^\+?[0-9][0-9 ()-]{6,23}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateInquiry(data, choices) {
  if (!data || !["general", "nri"].includes(data.kind) || typeof data !== "object" || data.website !== "") {
    return { errors: {}, invalid: true };
  }

  const output = { kind: data.kind };
  const errors = {};
  function field(name, message, max = 120, test = (value) => value.length > 0) {
    const value = typeof data[name] === "string" ? data[name].trim() : "";
    if ((data[name] !== undefined && typeof data[name] !== "string") || value.length > max || !test(value)) {
      errors[name] = value.length > max ? "Enter no more than " + max + " characters." : message;
    }
    output[name] = value;
  }

  field("name", "Enter your full name.");
  field("email", "Enter a valid email address.", 254, (value) => emailPattern.test(value));
  field("phone", "Enter a phone number with 7 to 15 digits.", 24,
    (value) => phonePattern.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, "")));
  field("service", "Choose a service.", 120, (value) => choices.services.includes(value));

  if (data.kind === "nri") {
    field("country", "Enter your country of residence.");
    field("location", "Enter the property city.");
    field("property", "Choose a property type.", 120, (value) => choices.properties.includes(value));
  } else {
    for (const name of ["company", "location", "budget"]) field(name, "Enter valid text.", 120, () => true);
    field("method", "Choose a contact method.", 120, (value) => !value || choices.methods.includes(value));
  }

  field("message", "Enter at least 10 characters about your inquiry.", 2500, (value) => value.length >= 10);
  if (data.consent !== true) errors.consent = "Give consent so we can respond to your inquiry.";
  return { invalid: Object.keys(errors).length > 0, errors, output };
}

globalThis.aventraValidateInquiry = validateInquiry;
