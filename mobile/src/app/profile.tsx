import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { ApiError, errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, fonts, space, type } from '@/theme/tokens';
import {
  validateAddress,
  validateBusinessName,
  validateMobile,
  validateName,
} from '@/utils/validation';

type Field = 'name' | 'mobile' | 'address' | 'businessName';

const validators: Record<Field, (v: string) => string | null> = {
  name: validateName,
  mobile: validateMobile,
  address: validateAddress,
  businessName: validateBusinessName,
};

/** First-login profile. Only reachable while the profile is incomplete, so it is shown once. */
export default function ProfileScreen() {
  const { account, setAccount, signOut } = useAuth();
  const mobileRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const businessRef = useRef<TextInput>(null);

  const [values, setValues] = useState<Record<Field, string>>({ name: '', mobile: '', address: '', businessName: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (f: Field) => (raw: string) => {
    const v = f === 'mobile' ? raw.replace(/\D/g, '').slice(0, 10) : raw;
    setValues((s) => ({ ...s, [f]: v }));
    if (errors[f]) setErrors((e) => ({ ...e, [f]: validators[f](v) }));
  };
  const blur = (f: Field) => () => values[f] && setErrors((e) => ({ ...e, [f]: validators[f](values[f]) }));

  const submit = async () => {
    const next = Object.fromEntries(
      (Object.keys(validators) as Field[]).map((f) => [f, validators[f](values[f])]),
    ) as Record<Field, string | null>;
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean) || submitting) return;

    setSubmitting(true);
    try {
      const user = await api.saveProfile({
        name: values.name.trim(),
        mobile: `+91${values.mobile}`,
        address: values.address.trim(),
        businessName: values.businessName.trim() || null,
      });
      setAccount(user); // the navigator moves on to task selection
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setErrors(err.fields);
      else setFormError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can finish your profile the next time you log in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen footer={<Button title="Save and continue" onPress={submit} loading={submitting} />}>
      <Header
        eyebrow="Step 1 of 2 · Your details"
        title="Tell us about you"
        subtitle="So your Lifestyle Manager can coordinate visits and deliveries smoothly."
      />
      {formError ? <Banner tone="error" message={formError} /> : null}

      <TextField
        label="Name"
        icon="user"
        placeholder="Full name"
        value={values.name}
        onChangeText={set('name')}
        onBlur={blur('name')}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => mobileRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={mobileRef}
        label="Mobile number"
        icon="phone"
        prefix="+91"
        placeholder="98765 43210"
        value={values.mobile}
        onChangeText={set('mobile')}
        onBlur={blur('mobile')}
        error={errors.mobile}
        keyboardType="phone-pad"
        autoComplete="tel-national"
        textContentType="telephoneNumber"
        maxLength={10}
        returnKeyType="next"
        onSubmitEditing={() => addressRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={addressRef}
        label="Address"
        icon="map-pin"
        placeholder="Flat / house no., building, street, area, city"
        value={values.address}
        onChangeText={set('address')}
        onBlur={blur('address')}
        error={errors.address}
        multiline
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        maxLength={300}
      />
      <TextField
        ref={businessRef}
        label="Business name"
        optional
        icon="briefcase"
        placeholder="Only if you have one"
        value={values.businessName}
        onChangeText={set('businessName')}
        onBlur={blur('businessName')}
        error={errors.businessName}
        autoCapitalize="words"
        textContentType="organizationName"
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <View style={styles.footerNote}>
        <Text style={type.small}>Signed in as {account?.email}. </Text>
        <Pressable onPress={confirmLogout} hitSlop={10} accessibilityRole="button">
          <Text style={styles.link}>Not you? Log out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footerNote: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: space.sm, minHeight: 32 },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
});
