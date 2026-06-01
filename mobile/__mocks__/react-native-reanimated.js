const { View, Text, ScrollView, Image } = require('react-native');

const useSharedValue = (initialValue) => ({ value: initialValue });
const useAnimatedStyle = (worklet) => {
  try { worklet(); } catch (_) {}
  return {};
};
const withRepeat = (animation) => animation;
const withSequence = (...animations) => animations[0];
const withTiming = (toValue, _config) => toValue;
const withSpring = (toValue, _config) => toValue;
const useReducedMotion = () => false;

const Animated = {
  View,
  Text,
  ScrollView,
  Image,
  createAnimatedComponent: (component) => component,
};

module.exports = {
  __esModule: true,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  useReducedMotion,
  Animated,
  default: Animated,
};
