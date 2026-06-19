/**
 * Mock for @rn-primitives/portal — renders children inline in tests
 * instead of through a portal host, making dialog content queryable by RNTL.
 */
const React = require('react');

function Host({ children }) {
  return React.createElement(React.Fragment, null, children);
}

function Portal({ children }) {
  return React.createElement(React.Fragment, null, children);
}

module.exports = {
  __esModule: true,
  Host,
  Portal,
};
