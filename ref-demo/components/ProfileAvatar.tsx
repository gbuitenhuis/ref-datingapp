import { Image, ImageStyle, StyleProp } from 'react-native';

type ProfileAvatarProps = {
  photo?: string;
  name?: string;
  userId?: string;
  style: StyleProp<ImageStyle>;
};

export const getProfileAvatarUri = ({
  photo,
  name,
  userId,
}: Omit<ProfileAvatarProps, 'style'>) => {
  const trimmedPhoto = photo?.trim();
  if (trimmedPhoto) return trimmedPhoto;

  const seed = encodeURIComponent(userId?.trim() || name?.trim() || 'ref-user');
  return `https://api.dicebear.com/7.x/adventurer-neutral/png?seed=${seed}&backgroundColor=fdf2f5,dbeafe,eaf7ee,fff4e6`;
};

export function ProfileAvatar({ photo, name, userId, style }: ProfileAvatarProps) {
  return (
    <Image
      source={{ uri: getProfileAvatarUri({ photo, name, userId }) }}
      style={style}
    />
  );
}
