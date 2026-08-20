import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { io } from 'socket.io-client';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://bitematchh.onrender.com').replace(/\/$/, '');
const SESSION_KEY = 'bitematch.mobile.session.v1';

async function request(path, options = {}, token) {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'İşlem şu an tamamlanamadı.');
  return payload;
}

function BrandMark() {
  return <View style={styles.brandRow}><Text style={styles.brandFlame}>◒</Text><Text style={styles.brandName}>BiteMatch</Text></View>;
}

function LoginScreen({ onAuthenticated }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!identifier.trim() || !password) return Alert.alert('Eksik bilgi', 'E-posta/kullanıcı adı ve şifreni gir.');
    setLoading(true);
    try {
      const session = await request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: identifier.trim(), password }) });
      await onAuthenticated(session);
    } catch (error) {
      Alert.alert('Giriş yapılamadı', error.message);
    } finally { setLoading(false); }
  };
  return <SafeAreaView style={styles.screen}>
    <StatusBar style="light" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.authWrap}>
      <BrandMark />
      <View style={styles.authCard}>
        <Text style={styles.eyebrow}>MOBİL BETA</Text>
        <Text style={styles.title}>Tekrar hoş geldin.</Text>
        <Text style={styles.subtitle}>Arkadaşlarınla karar vermeye kaldığın yerden devam et.</Text>
        <Text style={styles.label}>E-posta veya kullanıcı adı</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="ornek@eposta.com" placeholderTextColor="#74829b" style={styles.input} value={identifier} onChangeText={setIdentifier} />
        <Text style={styles.label}>Şifre</Text>
        <TextInput secureTextEntry placeholder="Şifren" placeholderTextColor="#74829b" style={styles.input} value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        <Pressable accessibilityRole="button" disabled={loading} onPress={submit} style={[styles.primaryButton, loading && styles.buttonDisabled]}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Giriş yap</Text>}</Pressable>
        <Text style={styles.helperText}>Google giriş, kayıt ve şifre sıfırlama akışları mobil beta sonraki ekran paketinde eklenecek.</Text>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function HomeScreen({ session, onLogout }) {
  const [socketConnected, setSocketConnected] = useState(false);
  const socket = useMemo(() => io(API_URL, { autoConnect: false, transports: ['websocket', 'polling'], auth: { token: session.token } }), [session.token]);
  useEffect(() => {
    const connected = () => setSocketConnected(true);
    const disconnected = () => setSocketConnected(false);
    socket.on('connect', connected); socket.on('disconnect', disconnected); socket.connect();
    return () => { socket.off('connect', connected); socket.off('disconnect', disconnected); socket.disconnect(); };
  }, [socket]);
  return <SafeAreaView style={styles.screen}>
    <StatusBar style="light" />
    <View style={styles.homeWrap}>
      <View style={styles.topBar}><BrandMark /><View style={[styles.connection, socketConnected ? styles.connectionOnline : styles.connectionWaiting]}><View style={styles.connectionDot} /><Text style={styles.connectionText}>{socketConnected ? 'Bağlı' : 'Bağlanıyor'}</Text></View></View>
      <View style={styles.heroCard}><Text style={styles.eyebrow}>MOBİL UYGULAMA ALTYAPISI HAZIR</Text><Text style={styles.heroTitle}>Merhaba, {session.name || session.username}</Text><Text style={styles.heroText}>Oturumun, BiteMatch API’si ve gerçek zamanlı bağlantın mobil uygulamaya taşındı.</Text></View>
      <View style={styles.nextCard}><Text style={styles.nextTitle}>Sıradaki mobil ekranlar</Text><Text style={styles.nextLine}>• Keşfet ve oda oluşturma</Text><Text style={styles.nextLine}>• Davet / bekleme salonu</Text><Text style={styles.nextLine}>• Swipe, eşleşme ve mesajlar</Text><Text style={styles.nextLine}>• Profil, bildirimler ve ayarlar</Text></View>
      <Pressable accessibilityRole="button" onPress={onLogout} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Bu cihazdan çıkış yap</Text></Pressable>
    </View>
  </SafeAreaView>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);
  useEffect(() => {
    SecureStore.getItemAsync(SESSION_KEY).then((stored) => stored && setSession(JSON.parse(stored))).catch(() => SecureStore.deleteItemAsync(SESSION_KEY)).finally(() => setRestoring(false));
  }, []);
  const authenticate = async (nextSession) => { await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(nextSession)); setSession(nextSession); };
  const logout = async () => { await SecureStore.deleteItemAsync(SESSION_KEY); setSession(null); };
  if (restoring) return <SafeAreaView style={[styles.screen, styles.loadingScreen]}><StatusBar style="light" /><ActivityIndicator color="#ff545b" size="large" /></SafeAreaView>;
  return session ? <HomeScreen session={session} onLogout={logout} /> : <LoginScreen onAuthenticated={authenticate} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#091226' }, loadingScreen: { alignItems: 'center', justifyContent: 'center' }, authWrap: { flex: 1, justifyContent: 'center', padding: 24 }, homeWrap: { flex: 1, padding: 24, gap: 18 }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandFlame: { color: '#ff555d', fontSize: 27, fontWeight: '900' }, brandName: { color: '#ff6267', fontSize: 27, fontWeight: '800', letterSpacing: -1 }, authCard: { marginTop: 36, backgroundColor: '#17233a', borderColor: '#283955', borderWidth: 1, borderRadius: 22, padding: 24 }, eyebrow: { color: '#a999ff', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 8 }, subtitle: { color: '#9eacc4', fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 28 }, label: { color: '#d5ddec', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12 }, input: { borderWidth: 1, borderColor: '#3a4a68', borderRadius: 12, color: '#fff', fontSize: 16, paddingHorizontal: 15, height: 52, backgroundColor: '#111c31' }, primaryButton: { height: 52, backgroundColor: '#ff575f', alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginTop: 28 }, buttonDisabled: { opacity: 0.65 }, primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' }, helperText: { color: '#7f8da4', fontSize: 12, lineHeight: 18, marginTop: 18 }, topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, connection: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, connectionOnline: { backgroundColor: '#143e36' }, connectionWaiting: { backgroundColor: '#3b3143' }, connectionDot: { height: 7, width: 7, borderRadius: 99, backgroundColor: '#33d179' }, connectionText: { color: '#d9f9e7', fontSize: 12, fontWeight: '700' }, heroCard: { borderRadius: 22, padding: 24, backgroundColor: '#192640', borderWidth: 1, borderColor: '#34496c', marginTop: 14 }, heroTitle: { color: '#fff', fontSize: 27, fontWeight: '800', marginTop: 9 }, heroText: { color: '#a9b8d0', fontSize: 15, lineHeight: 22, marginTop: 10 }, nextCard: { backgroundColor: '#111d33', borderColor: '#253752', borderWidth: 1, borderRadius: 18, padding: 20 }, nextTitle: { color: '#fff', fontWeight: '800', fontSize: 17, marginBottom: 12 }, nextLine: { color: '#acb9d0', fontSize: 14, lineHeight: 25 }, secondaryButton: { borderColor: '#5d6a82', borderWidth: 1, borderRadius: 14, alignItems: 'center', paddingVertical: 15, marginTop: 'auto' }, secondaryButtonText: { color: '#d5dcea', fontWeight: '800', fontSize: 15 },
});
