import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, WS_URL } from '../constants/theme';

type TermLine = {
  id: string;
  type: 'command' | 'stdout' | 'stderr' | 'system' | 'clear';
  text: string;
};

let lineCounter = 0;
const uid = () => String(++lineCounter);

export default function TerminalScreen() {
  const [lines, setLines] = useState<TermLine[]>([]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('~');
  const [connected, setConnected] = useState(false);
  const [executing, setExecuting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  const addLine = useCallback((type: TermLine['type'], text: string) => {
    if (type === 'clear') {
      setLines([]);
      return;
    }
    setLines(prev => [...prev, { id: uid(), type, text }]);
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const url = `${WS_URL}/api/ws/terminal`;
    addLine('system', `Conectando a ${url}...`);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      addLine('system', '✅ Terminal conectada');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'init':
            setCwd(msg.cwd);
            break;
          case 'stdout':
            addLine('stdout', msg.data);
            break;
          case 'stderr':
            addLine('stderr', msg.data);
            break;
          case 'done':
            setCwd(msg.cwd);
            setExecuting(false);
            break;
          case 'clear':
            setLines([]);
            break;
          case 'error':
            addLine('stderr', msg.data);
            break;
        }
      } catch {
        addLine('stdout', event.data);
      }
    };

    ws.onerror = () => {
      addLine('system', '❌ Error de conexión');
      setConnected(false);
    };

    ws.onclose = () => {
      addLine('system', '🔌 Desconectado');
      setConnected(false);
      setExecuting(false);
    };

    wsRef.current = ws;
  }, [addLine]);

  useEffect(() => {
    connectWs();
    return () => { wsRef.current?.close(); };
  }, [connectWs]);

  const sendCommand = () => {
    const cmd = input.trim();
    if (!cmd || !connected || executing) return;
    addLine('command', `${shortCwd(cwd)}$ ${cmd}`);
    wsRef.current?.send(JSON.stringify({ command: cmd }));
    setInput('');
    setExecuting(true);
  };

  const shortCwd = (path: string) => {
    const home = '/root';
    if (path === home) return '~';
    if (path.startsWith(home + '/')) return '~' + path.slice(home.length);
    return path;
  };

  const getLineColor = (type: string) => {
    switch (type) {
      case 'command': return COLORS.primary;
      case 'stderr': return COLORS.error;
      case 'system': return COLORS.warning;
      default: return COLORS.termText;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.dot, { backgroundColor: connected ? COLORS.success : COLORS.error }]} />
            <Text style={styles.headerTitle}>TERMINAL</Text>
          </View>
          <TouchableOpacity
            testID="terminal-reconnect-btn"
            onPress={connectWs}
            disabled={connected}
          >
            <Ionicons name="refresh" size={18} color={connected ? COLORS.textDim : COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Output */}
        <ScrollView
          ref={scrollRef}
          style={styles.output}
          contentContainerStyle={styles.outputContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {lines.map((line) => (
            <Text
              key={line.id}
              testID={`terminal-line-${line.id}`}
              style={[styles.lineText, { color: getLineColor(line.type) }]}
            >
              {line.text}
            </Text>
          ))}
          {!executing && connected ? (
            <Text style={styles.promptText}>{shortCwd(cwd)}$ </Text>
          ) : null}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <Text style={styles.promptPrefix}>{shortCwd(cwd)}$</Text>
          <TextInput
            ref={inputRef}
            testID="terminal-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendCommand}
            placeholder={executing ? 'Ejecutando...' : 'Escribe un comando...'}
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            editable={connected && !executing}
            returnKeyType="send"
          />
          <TouchableOpacity
            testID="terminal-send-btn"
            style={[styles.sendBtn, (!connected || executing) && styles.sendBtnDisabled]}
            onPress={sendCommand}
            disabled={!connected || executing}
          >
            <Ionicons name="arrow-forward" size={18} color={connected && !executing ? '#000' : COLORS.textDim} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.termBg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },
  output: { flex: 1, backgroundColor: COLORS.termBg },
  outputContent: { padding: 12, paddingBottom: 8 },
  lineText: { fontSize: 13, fontFamily: FONTS.mono, lineHeight: 20 },
  promptText: { fontSize: 13, fontFamily: FONTS.mono, color: COLORS.primary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8,
  },
  promptPrefix: { fontSize: 13, fontFamily: FONTS.mono, color: COLORS.primary, marginRight: 6 },
  input: {
    flex: 1, fontSize: 14, fontFamily: FONTS.mono,
    color: COLORS.textPrimary, paddingVertical: 8, paddingHorizontal: 4,
  },
  sendBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  sendBtnDisabled: { backgroundColor: COLORS.surfaceHL },
});
