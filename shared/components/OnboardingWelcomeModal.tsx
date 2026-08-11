import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { PillButton } from '@/shared/components/PillButton';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { theme } from '@/shared/theme';
import { textStyles } from '@/shared/theme/typography';

const onboardingSteps: Array<{
  eyebrow: string;
  title: string;
  body: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  {
    eyebrow: 'Start Here',
    title: 'A visual memory system',
    body: 'Save screenshots, references, and ideas before they disappear into your camera roll.',
    icon: 'camera',
  },
  {
    eyebrow: 'The Tray',
    title: 'Your inbox for new Snaps',
    body: 'Unsorted saves land in The Tray first. Move keepers into Shelves, favorite what matters, or archive the rest.',
    icon: 'inbox',
  },
  {
    eyebrow: 'Shelves',
    title: 'Collections with context',
    body: 'Use Shelves for rooms, outfits, projects, moods, wishlists, or any idea you want to revisit.',
    icon: 'archive',
  },
  {
    eyebrow: 'Board',
    title: 'A map of your archive',
    body: 'Arrange Shelves and Stacks visually so your saved inspiration feels memorable, not like a database.',
    icon: 'map',
  },
  {
    eyebrow: 'Library',
    title: 'Find everything later',
    body: 'Search titles, thoughts, labels, sources, Shelves, favorites, and archived Snaps. Images stay local to this device.',
    icon: 'book-open',
  },
];

type OnboardingWelcomeModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onCreateFirstShelf: () => void;
  onOpenTray: () => void;
  finalPrimaryLabel?: string;
  finalPrimaryIcon?: keyof typeof Feather.glyphMap;
  finalSecondaryLabel?: string;
  finalSecondaryIcon?: keyof typeof Feather.glyphMap;
};

export function OnboardingWelcomeModal({
  visible,
  onDismiss,
  onCreateFirstShelf,
  onOpenTray,
  finalPrimaryLabel = 'Create First Shelf',
  finalPrimaryIcon = 'plus',
  finalSecondaryLabel = 'Open The Tray',
  finalSecondaryIcon = 'inbox',
}: OnboardingWelcomeModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = onboardingSteps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isFinalStep = stepIndex === onboardingSteps.length - 1;

  useEffect(() => {
    if (visible) {
      setStepIndex(0);
    }
  }, [visible]);

  function handlePrimaryPress() {
    if (!isFinalStep) {
      setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1));
      return;
    }

    onCreateFirstShelf();
  }

  function handleBackPress() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(46, 35, 26, 0.32)',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <SurfaceCard style={{ padding: theme.spacing.lg }} testID="onboarding-welcome-modal">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              {!isFirstStep ? (
                <Pressable
                  onPress={handleBackPress}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Previous tutorial step"
                  testID="onboarding-back-button"
                >
                  <Feather name="arrow-left" size={22} color={theme.colors.primary} />
                </Pressable>
              ) : null}
              <Text style={textStyles.brand}>SnapShelf</Text>
            </View>
            <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip onboarding">
              <Feather name="x" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <View
            style={{
              alignSelf: 'flex-start',
              width: 66,
              height: 66,
              borderRadius: 28,
              backgroundColor: theme.colors.surfaceSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.lg,
            }}
          >
            <Feather name={step.icon} size={26} color={theme.colors.primary} />
          </View>

          <Text style={[textStyles.eyebrow, { marginBottom: theme.spacing.xs }]}>{step.eyebrow}</Text>
          <Text style={[textStyles.displaySm, { marginBottom: theme.spacing.sm }]}>{step.title}</Text>
          <Text style={[textStyles.bodyMd, { marginBottom: theme.spacing.lg }]}>{step.body}</Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing.lg }}>
            {onboardingSteps.map((item, index) => (
              <View
                key={item.eyebrow}
                style={{
                  width: index === stepIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index === stepIndex ? theme.colors.primary : theme.colors.borderSoft,
                }}
              />
            ))}
          </View>

          <PillButton
            label={isFinalStep ? finalPrimaryLabel : 'Next'}
            icon={isFinalStep ? finalPrimaryIcon : 'arrow-right'}
            fullWidth
            onPress={handlePrimaryPress}
            testID="onboarding-primary-button"
          />

          <View style={{ marginTop: theme.spacing.sm }}>
            {isFinalStep ? (
              <PillButton label={finalSecondaryLabel} icon={finalSecondaryIcon} variant="secondary" fullWidth onPress={onOpenTray} />
            ) : (
              <PillButton label="Skip" variant="secondary" fullWidth onPress={onDismiss} />
            )}
          </View>
        </SurfaceCard>
      </View>
    </Modal>
  );
}
