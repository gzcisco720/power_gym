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

// Entry/exit animation builders (FadeIn, FadeOut, SlideInUp, etc.)
function makeAnimationBuilder() {
  const builder = {
    duration: () => builder,
    delay: () => builder,
    easing: () => builder,
    springify: () => builder,
    damping: () => builder,
    stiffness: () => builder,
    build: () => ({}),
  };
  return builder;
}

const FadeIn = makeAnimationBuilder();
const FadeOut = makeAnimationBuilder();
const SlideInUp = makeAnimationBuilder();
const SlideOutDown = makeAnimationBuilder();
const ZoomIn = makeAnimationBuilder();
const ZoomOut = makeAnimationBuilder();

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
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  default: Animated,
};
