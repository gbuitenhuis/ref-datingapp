import { Image, View } from 'react-native';
import Colors from '@/constants/colors';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZES: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 96,
  '2xl': 120,
};

interface AvatarProps {
  photo?: string;
  name?: string;
  userId?: string;
  size?: AvatarSize;
  ring?: boolean;
}

function getUri(photo?: string, name?: string, userId?: string) {
  const trimmed = photo?.trim();
  if (trimmed) return trimmed;
  const seed = encodeURIComponent(userId?.trim() || name?.trim() || 'ref-user');
  return `https://api.dicebear.com/7.x/adventurer-neutral/png?seed=${seed}&backgroundColor=fdf2f5,dbeafe,eaf7ee,fff4e6`;
}

export function Avatar({ photo, name, userId, size = 'md', ring }: AvatarProps) {
  const dim = SIZES[size];
  const radius = dim / 2;
  const uri = getUri(photo, name, userId);

  if (ring) {
    return (
      <View
        style={{
          width: dim + 4,
          height: dim + 4,
          borderRadius: (dim + 4) / 2,
          borderWidth: 2,
          borderColor: Colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image source={{ uri }} style={{ width: dim, height: dim, borderRadius: radius }} />
      </View>
    );
  }

  return <Image source={{ uri }} style={{ width: dim, height: dim, borderRadius: radius }} />;
}
