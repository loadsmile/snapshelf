import Svg, { Circle, Path, Rect } from 'react-native-svg';

type TrayIconProps = {
  color: string;
  size?: number;
  focused?: boolean;
};

export function TrayIcon({ color, size = 24, focused = false }: TrayIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {focused ? <Circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.22)" /> : null}
      <Path
        d="M4 13.4L5.7 18.1C6 18.9 6.7 19.4 7.6 19.4H16.4C17.3 19.4 18 18.9 18.3 18.1L20 13.4H15.5C14.9 13.4 14.4 13.8 14.1 14.3L13.7 15.1C13.4 15.6 12.8 16 12.2 16H11.8C11.2 16 10.6 15.6 10.3 15.1L9.9 14.3C9.6 13.8 9.1 13.4 8.5 13.4H4Z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="8" y="4.1" width="8" height="7.8" rx="1.9" stroke={color} strokeWidth="1.9" />
      <Path d="M10.1 8L11.5 9.3L14.1 6.6" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
