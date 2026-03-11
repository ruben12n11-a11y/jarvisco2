import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, Platform, KeyboardAvoidingView,
  ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BACKEND_URL } from '../constants/theme';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  engine?: string;
  risk_level?: string | null;
  risk_description?: string | null;
};

let msgCounter = 0;

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hola, soy JarvisCO. Tu copiloto de desarrollo IA.\n\nPuedo ayudarte con:\n• Generar código\n• Analizar problemas\n• Ejecutar comandos\n\nEscribe tu consulta para comenzar.', engine: 'system' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useAdvanced, setUseAdvanced] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: String(++msgCounter), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, use_advanced: useAdvanced }),
      });
      const data = await res.json();
      const aiMsg: Message = {
        id: String(++msgCounter),
        role: 'assistant',
        content: data.response || data.detail || 'Sin respuesta',
        engine: data.engine,
        risk_level: data.risk_level,
        risk_description: data.risk_description,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: String(++msgCounter), role: 'error',
        content: 'Error de conexión con el servidor',
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, useAdvanced]);

  const getRiskColor = (level: string | null | undefined) => {
    switch (level) {
      case 'CRITICAL': return COLORS.error;
      case 'HIGH': return COLORS.secondary;
      case 'MEDIUM': return COLORS.warning;
      default: return COLORS.success;
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isError = item.role === 'error';

    return (
      <View
        testID={`chat-message-${item.id}`}
        style={[
          styles.msgContainer,
          isUser ? styles.msgUser : styles.msgAI,
          isError && styles.msgError,
        ]}
      >
        {!isUser && (
          <View style={styles.msgHeader}>
            <Ionicons
              name={isError ? 'alert-circle' : 'hardware-chip'}
              size={14}
              color={isError ? COLORS.error : COLORS.primary}
            />
            <Text style={styles.msgEngine}>
              {isError ? 'ERROR' : (item.engine || 'JARVISCO').toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.msgText, isUser && styles.msgTextUser]}>
          {item.content}
        </Text>
        {item.risk_level && (
          <View style={[styles.riskBadge, { borderColor: getRiskColor(item.risk_level) }]}>
            <Ionicons name="shield" size={12} color={getRiskColor(item.risk_level)} />
            <Text style={[styles.riskText, { color: getRiskColor(item.risk_level) }]}>
              {item.risk_level}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="hardware-chip" size={20} color={COLORS.primary} />
            <Text style={styles.headerTitle}>JARVISCO</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.advLabel}>OLLAMA</Text>
            <Switch
              testID="chat-advanced-toggle"
              value={useAdvanced}
              onValueChange={setUseAdvanced}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={useAdvanced ? '#fff' : COLORS.textDim}
            />
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            testID="chat-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            placeholder="Escribe tu consulta..."
            placeholderTextColor={COLORS.textDim}
            multiline
            maxLength={2000}
            editable={!loading}
            returnKeyType="send"
          />
          <TouchableOpacity
            testID="chat-send-btn"
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={loading}
          >
            <Ionicons name="send" size={18} color={loading ? COLORS.textDim : '#000'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.primary, letterSpacing: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  advLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1 },
  msgList: { padding: 16, paddingBottom: 8 },
  msgContainer: { marginBottom: 12, padding: 12, borderWidth: 1, maxWidth: '85%' },
  msgUser: { alignSelf: 'flex-end', borderColor: COLORS.primary, backgroundColor: 'rgba(0,240,255,0.05)' },
  msgAI: { alignSelf: 'flex-start', borderColor: COLORS.success, backgroundColor: 'rgba(57,255,20,0.03)' },
  msgError: { borderColor: COLORS.error, backgroundColor: 'rgba(255,69,58,0.05)' },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  msgEngine: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1 },
  msgText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20, fontFamily: FONTS.mono },
  msgTextUser: { color: COLORS.primary },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, borderWidth: 1, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2 },
  riskText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.surface },
  loadingText: { fontSize: 12, color: COLORS.textSecondary },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8,
  },
  input: {
    flex: 1, fontSize: 14, fontFamily: FONTS.mono,
    color: COLORS.textPrimary, paddingVertical: 8, paddingHorizontal: 8,
    maxHeight: 100, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, marginLeft: 8,
  },
  sendBtnDisabled: { backgroundColor: COLORS.surfaceHL },
});
