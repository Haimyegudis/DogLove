/**
 * VerifiedBadge — small "✓ מאומת" pill displayed next to a dog owner's name.
 *
 * Usage (two modes):
 *   <VerifiedBadge verified={true} />          // pre-fetched boolean
 *   <VerifiedBadge userId="uuid-here" />        // fetches from RPC on mount
 *
 * Renders nothing when not verified or while loading.
 * RTL-friendly: the checkmark leads (visually right-to-left the text appears first).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius } from '../theme';
import { isVerified } from '../services/verification';

type Props =
  | { verified: boolean; userId?: never }
  | { userId: string; verified?: never };

export default function VerifiedBadge({ verified, userId }: Props) {
  const [show, setShow] = useState<boolean>(
    // If a boolean was passed directly, use it immediately.
    typeof verified === 'boolean' ? verified : false,
  );

  useEffect(() => {
    // Only fetch from the server when userId is provided (not the pre-fetched path).
    if (userId == null) return;

    let cancelled = false;
    isVerified(userId).then(({ data }) => {
      if (!cancelled && data === true) setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Also react to a prop change on the boolean path (e.g. parent refreshes).
  useEffect(() => {
    if (typeof verified === 'boolean') setShow(verified);
  }, [verified]);

  if (!show) return null;

  return (
    <View style={styles.pill} accessibilityLabel="מאומת" accessibilityRole="text">
      <Text style={styles.check}>✓</Text>
      <Text style={styles.label}>מאומת</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row-reverse', // RTL: checkmark on the right, text on the left
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  check: {
    color: colors.white,
    fontSize: 11,
    fontFamily: font.bold,
    lineHeight: 16,
  },
  label: {
    color: colors.white,
    fontSize: 11,
    fontFamily: font.medium,
    lineHeight: 16,
  },
});
