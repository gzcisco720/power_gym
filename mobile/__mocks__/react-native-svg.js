const React = require('react');
const { View } = require('react-native');

function mockSvgComponent(name) {
  return function MockSvgComponent(props) {
    return React.createElement(View, { testID: name, ...props });
  };
}

module.exports = {
  __esModule: true,
  default: mockSvgComponent('Svg'),
  Svg: mockSvgComponent('Svg'),
  Circle: mockSvgComponent('Circle'),
  Ellipse: mockSvgComponent('Ellipse'),
  G: mockSvgComponent('G'),
  Text: mockSvgComponent('SvgText'),
  TSpan: mockSvgComponent('TSpan'),
  TextPath: mockSvgComponent('TextPath'),
  Path: mockSvgComponent('Path'),
  Polygon: mockSvgComponent('Polygon'),
  Polyline: mockSvgComponent('Polyline'),
  Line: mockSvgComponent('Line'),
  Rect: mockSvgComponent('Rect'),
  Use: mockSvgComponent('Use'),
  Image: mockSvgComponent('Image'),
  Symbol: mockSvgComponent('Symbol'),
  Defs: mockSvgComponent('Defs'),
  LinearGradient: mockSvgComponent('LinearGradient'),
  RadialGradient: mockSvgComponent('RadialGradient'),
  Stop: mockSvgComponent('Stop'),
  ClipPath: mockSvgComponent('ClipPath'),
  Pattern: mockSvgComponent('Pattern'),
  Mask: mockSvgComponent('Mask'),
};
