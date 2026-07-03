const SystemSetting = require('../models/SystemSetting');

async function validatePasswordPolicy(password) {
  const settings = await SystemSetting.findOne();
  if (!settings || !settings.enablePasswordComplexity) {
    // If not enabled globally, just check minimum length of 6 characters as base requirement
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }
    return;
  }

  const complexity = settings.passwordComplexity || 'Strong';
  const minLength = settings.passwordMinLength || (complexity === 'Basic' ? 6 : 8);

  if (complexity === 'Basic') {
    if (password.length < minLength) {
      throw new Error(`Password complexity check failed: must be at least ${minLength} characters long.`);
    }
  } else if (complexity === 'Medium') {
    if (password.length < minLength) {
      throw new Error(`Password complexity check failed: must be at least ${minLength} characters long.`);
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error(`Password complexity check failed: must be at least ${minLength} characters long and contain both letters and numbers.`);
    }
  } else if (complexity === 'Strong') {
    if (password.length < minLength) {
      throw new Error(`Password complexity check failed: must be at least ${minLength} characters long.`);
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error(`Password complexity check failed: must be at least ${minLength} characters long and contain uppercase, lowercase, number, and special character.`);
    }
  }
}

module.exports = { validatePasswordPolicy };
