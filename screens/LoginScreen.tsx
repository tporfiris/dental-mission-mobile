// screens/LoginScreen-DUAL.tsx
// ✅ DUAL LOGIN: Mission codes for clinicians, email/password for admin
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const { loginWithCode } = useAuth();
  
  const [mode, setMode] = useState<'code' | 'admin'>('code');
  
  // Code login
  const [code, setCode] = useState('');
  
  // Admin login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Mission code login
  const handleCodeLogin = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter your mission code');
      return;
    }

    setLoading(true);
    try {
      await loginWithCode(code);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin email/password login
  const handleAdminLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Admin login attempt:', email);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('✅ Admin login successful');
    } catch (error: any) {
      console.error('❌ Admin login failed:', error.code);
      
      let errorMessage = 'Login failed';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>🦷</Text>
        <Text style={styles.title}>Dental Mission App</Text>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <Pressable
          style={[
            styles.modeButton,
            mode === 'code' && styles.modeButtonActive
          ]}
          onPress={() => setMode('code')}
        >
          <Text style={[
            styles.modeButtonText,
            mode === 'code' && styles.modeButtonTextActive
          ]}>
            Mission Code
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.modeButton,
            mode === 'admin' && styles.modeButtonActive
          ]}
          onPress={() => setMode('admin')}
        >
          <Text style={[
            styles.modeButtonText,
            mode === 'admin' && styles.modeButtonTextActive
          ]}>
            Admin Login
          </Text>
        </Pressable>
      </View>

      {/* Mission Code Form */}
      {mode === 'code' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Mission Code</Text>
          <Text style={styles.formSubtitle}>Works offline - No internet needed</Text>

          <Text style={styles.label}>Your Code</Text>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={setCode}
            placeholder="ALICE-2026"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleCodeLogin}
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCodeLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </Pressable>

          <View style={styles.helpBox}>
            <Text style={styles.helpText}>
              Your mission code was provided by your administrator.
              Works completely offline during missions.
            </Text>
          </View>
        </View>
      )}

      {/* Admin Email/Password Form */}
      {mode === 'admin' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>🔐 Admin Login</Text>
          <Text style={styles.formSubtitle}>Requires internet connection</Text>
          <Text style={styles.formSubtitle}>IMPORTANT: if you would like to sync the patient data with the cloud database to view the data on the admin dashboard, once reconnected to wifi, login to your clinician account and wait a few minutes to allow the data to sync to the cloud. Then login as an admin user.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@mission.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#999"
            secureTextEntry
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleAdminLogin}
          />

          <Pressable
            style={[styles.button, styles.adminButton, loading && styles.buttonDisabled]}
            onPress={handleAdminLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Admin Login</Text>
            )}
          </Pressable>

          <View style={styles.adminInfoBox}>
            <Text style={styles.adminInfoText}>
              Admin access for dashboard, reports, and user management.
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#333',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  adminButton: {
    backgroundColor: '#6f42c1',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  helpText: {
    fontSize: 13,
    color: '#004085',
    lineHeight: 20,
  },
  adminInfoBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f3e5f5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6f42c1',
  },
  adminInfoText: {
    fontSize: 13,
    color: '#4a148c',
    lineHeight: 20,
  },
});