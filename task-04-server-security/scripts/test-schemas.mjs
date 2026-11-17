import { SignupSchema, LoginSchema, ResetSchema, getFirstErrorMessage } from '../../app/src/schemas.js';

console.log('Testing Zod Schemas...');

// 1. Valid Signup
const validSignup = SignupSchema.safeParse({
  name: ' Folake Balogun ',
  email: ' Folake.Balogun@EXAMPLE.COM ',
  password: '   BespokeKaftan#2026!   ',
  terms: 'on',
  role: 'admin' // Attempted privilege escalation
});
console.assert(validSignup.success === true, 'Valid signup should succeed');
console.assert(validSignup.data.email === 'folake.balogun@example.com', 'Email should be lowercase and trimmed');
console.assert(validSignup.data.name === 'Folake Balogun', 'Name should be trimmed');
console.assert(validSignup.data.password === 'BespokeKaftan#2026!', 'Password outer spaces should be trimmed');
console.assert(validSignup.data.role === 'client', 'Injected role admin should be ignored and set to client');
console.assert(validSignup.data.termsAccepted === true, 'Terms should be boolean true');

// 2. Short password
const shortPwd = SignupSchema.safeParse({
  name: 'Folake Balogun',
  email: 'folake@example.com',
  password: 'Short#1',
  terms: 'on'
});
console.assert(shortPwd.success === false, 'Short password should fail');
console.assert(getFirstErrorMessage(shortPwd.error) === 'Password must be at least 15 characters long.', 'Error message should match 15 chars requirement');

// 3. Password with internal spaces preserved
const internalSpacesPwd = SignupSchema.safeParse({
  name: 'Folake Balogun',
  email: 'folake@example.com',
  password: '  Senator Suit Blue Velvet 2026!  ',
  terms: 'on'
});
console.assert(internalSpacesPwd.success === true, 'Passphrase with internal spaces should succeed');
console.assert(internalSpacesPwd.data.password === 'Senator Suit Blue Velvet 2026!', 'Internal spaces should be preserved');

// 4. Missing terms
const noTerms = SignupSchema.safeParse({
  name: 'Folake Balogun',
  email: 'folake@example.com',
  password: 'BespokeKaftan#2026!'
});
console.assert(noTerms.success === false, 'Missing terms should fail');
console.assert(getFirstErrorMessage(noTerms.error) === 'You must agree to the Terms of Service to create an account.', 'Terms error message should match');

// 5. Mononym vs single-character name
const mononym = SignupSchema.safeParse({
  name: 'Sade',
  email: 'sade@example.com',
  password: 'BespokeKaftan#2026!',
  terms: 'on'
});
console.assert(mononym.success === true, 'Mononym Sade should succeed');

const singleChar = SignupSchema.safeParse({
  name: 'S',
  email: 's@example.com',
  password: 'BespokeKaftan#2026!',
  terms: 'on'
});
console.assert(singleChar.success === false, 'Single char name should fail');

// 6. Comprehensive Wrong-Type and Missing-Field Tests
const invalidTypeCases = [
  { label: 'omitted/undefined fields', payload: {} },
  { label: 'null fields', payload: { name: null, email: null, password: null, terms: null } },
  { label: 'array fields', payload: { name: ['Ade'], email: ['ade@example.com'], password: ['BespokeKaftan#2026!'], terms: ['on'] } },
  { label: 'object fields', payload: { name: { n: 'Ade' }, email: { e: 'ade@example.com' }, password: { p: 'BespokeKaftan#2026!' }, terms: {} } }
];

for (const { label, payload } of invalidTypeCases) {
  const signupRes = SignupSchema.safeParse(payload);
  console.assert(signupRes.success === false, `Signup should fail for ${label}`);
  const msg = getFirstErrorMessage(signupRes.error);
  console.assert(!msg.includes('expected string'), `Error message for ${label} must not leak type description: ${msg}`);
  console.assert(!msg.includes('invalid_type'), `Error message for ${label} must not leak invalid_type: ${msg}`);

  const loginRes = LoginSchema.safeParse(payload);
  console.assert(loginRes.success === false, `Login should fail for ${label}`);
  const loginMsg = getFirstErrorMessage(loginRes.error);
  console.assert(!loginMsg.includes('expected string'), `Login error message for ${label} must not leak type description: ${loginMsg}`);

  const resetRes = ResetSchema.safeParse(payload);
  console.assert(resetRes.success === false, `Reset should fail for ${label}`);
  const resetMsg = getFirstErrorMessage(resetRes.error);
  console.assert(!resetMsg.includes('expected string'), `Reset error message for ${label} must not leak type description: ${resetMsg}`);
}

// 7. Login schema valid & empty
const validLogin = LoginSchema.safeParse({
  email: ' Ade.Kolawole@EXAMPLE.COM ',
  password: '  BespokeKaftan#2026!  '
});
console.assert(validLogin.success === true, 'Valid login should succeed');
console.assert(validLogin.data.email === 'ade.kolawole@example.com', 'Login email should be normalized');
console.assert(validLogin.data.password === 'BespokeKaftan#2026!', 'Login password should be trimmed');

const emptyLoginPwd = LoginSchema.safeParse({
  email: 'ade@example.com',
  password: '   '
});
console.assert(emptyLoginPwd.success === false, 'Empty login password should fail');

// 8. Reset schema valid
const validReset = ResetSchema.safeParse({
  email: ' User@Example.COM '
});
console.assert(validReset.success === true, 'Valid reset should succeed');
console.assert(validReset.data.email === 'user@example.com', 'Reset email should be normalized');

console.log('All Zod schema unit tests (including wrong-type & missing-field checks) passed successfully!');
