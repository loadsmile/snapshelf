import Svg, { Circle, Path } from 'react-native-svg';

type BoardIconProps = {
  color: string;
  size?: number;
  focused?: boolean;
};

export function BoardIcon({ color, size = 24, focused = false }: BoardIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {focused ? <Circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.22)" /> : null}
      <Circle cx="12" cy="12" r="6.75" stroke={color} strokeWidth="1.9" />
      <Path d="M14.8 9.1L13.1 14.5L8.6 16.3L10.3 10.8L14.8 9.1Z" fill={color} />
      <Circle cx="12" cy="12" r="1.15" fill={focused ? '#C63A06' : color} />
    </Svg>
  );
}
