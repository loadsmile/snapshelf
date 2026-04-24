import Svg, { Path, Rect } from 'react-native-svg';

type DropIconProps = {
  color: string;
  size?: number;
  focused?: boolean;
};

export function DropIcon({ color, size = 24, focused = false }: DropIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.3" stroke={color} strokeWidth="1.9" />
      <Path d="M4.8 7.1L12 12.7L19.2 7.1" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      {focused ? <Rect x="16.9" y="3.1" width="4" height="4" rx="2" fill="rgba(255,255,255,0.22)" /> : null}
    </Svg>
  );
}
