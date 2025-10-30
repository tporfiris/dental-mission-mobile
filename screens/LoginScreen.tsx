// screens/LoginScreen.tsx - UPDATED with password reset
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleLogin = async () => {
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    try {
      console.log('🔐 Attempting login for:', email);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('✅ Login successful');
    } catch (e: any) {
      console.error('❌ Login error:', e.code, e.message);
      
      // User-friendly error messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (e.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (e.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (e.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (e.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
      } else if (e.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setError(errorMessage);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }

    setIsResettingPassword(true);
    
    try {
      console.log('📧 Sending password reset email to:', email);
      await sendPasswordResetEmail(auth, email.trim());
      
      Alert.alert(
        'Password Reset Email Sent',
        `Check your email at ${email} for instructions to reset your password.`,
        [{ text: 'OK' }]
      );
      
      console.log('✅ Password reset email sent');
    } catch (e: any) {
      console.error('❌ Password reset error:', e.code, e.message);
      
      let errorMessage = 'Failed to send password reset email';
      
      if (e.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (e.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dental Mission Login</Text>
      <Text style={styles.subtitle}>Enter your credentials to continue</Text>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError(''); // Clear error when user types
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={styles.input}
      />
      
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(''); // Clear error when user types
        }}
        secureTextEntry
        style={styles.input}
      />
      
      <View style={styles.buttonContainer}>
        <Button title="Login" onPress={handleLogin} />
      </View>
      
      <View style={styles.forgotPasswordContainer}>
        <Button 
          title={isResettingPassword ? "Sending..." : "Forgot Password?"} 
          onPress={handlePasswordReset}
          color="#666"
          disabled={isResettingPassword}
        />
      </View>
      
      <View style={styles.testAccountsContainer}>
        <Text style={styles.testAccountsTitle}>Test Accounts:</Text>
        <Text style={styles.testAccount}>Boss: boss@test.com</Text>
        <Text style={styles.testAccount}>Clinician: clinician1@test.com</Text>
        <Text style={styles.testAccount}>Password: mission123</Text>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 8, 
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: { 
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  error: { 
    color: '#dc3545',
    marginBottom: 15,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  forgotPasswordContainer: {
    marginTop: 10,
  },
  testAccountsContainer: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  testAccountsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  testAccount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});