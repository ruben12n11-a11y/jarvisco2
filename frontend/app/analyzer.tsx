import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Platform, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BACKEND_URL } from '../constants/theme';

type AnalysisResult = {
  success: boolean;
  syntax_error?: string | null;
  imports: string[];
  functions: string[];
  classes: string[];
  complexity: number | null;
  lines_of_code: number;
  total_imports?: number;
  total_functions?: number;
  total_classes?: number;
};

type RiskResult = {
  command: string;
  risk_level: string;
  description: string;
  requires_confirmation: boolean;
};

export default function AnalyzerScreen() {
  const [activeTab, setActiveTab] = useState<'code' | 'risk'>('code');
  const [codeInput, setCodeInput] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeCode = async () => {
    if (!codeInput.trim()) return;
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const evaluateRisk = async () => {
    if (!commandInput.trim()) return;
    setLoading(true);
    setError('');
    setRiskResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/evaluate-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandInput }),
      });
      const data = await res.json();
      setRiskResult(data);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return COLORS.error;
      case 'HIGH': return COLORS.secondary;
      case 'MEDIUM': return COLORS.warning;
      default: return COLORS.success;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="code-slash" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>ANÁLISIS</Text>
        </View>

        {/* Tab Switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            testID="tab-code"
            style={[styles.tab, activeTab === 'code' && styles.tabActive]}
            onPress={() => setActiveTab('code')}
          >
            <Ionicons name="code-slash" size={16} color={activeTab === 'code' ? COLORS.primary : COLORS.textDim} />
            <Text style={[styles.tabText, activeTab === 'code' && styles.tabTextActive]}>CÓDIGO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="tab-risk"
            style={[styles.tab, activeTab === 'risk' && styles.tabActive]}
            onPress={() => setActiveTab('risk')}
          >
            <Ionicons name="shield" size={16} color={activeTab === 'risk' ? COLORS.primary : COLORS.textDim} />
            <Text style={[styles.tabText, activeTab === 'risk' && styles.tabTextActive]}>RIESGO</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {activeTab === 'code' ? (
            <>
              <Text style={styles.label}>CÓDIGO PYTHON</Text>
              <TextInput
                testID="code-input"
                style={styles.codeInput}
                value={codeInput}
                onChangeText={setCodeInput}
                multiline
                placeholder="Pega tu código Python aquí..."
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
              />
              <TouchableOpacity
                testID="analyze-btn"
                style={[styles.actionBtn, !codeInput.trim() && styles.btnDisabled]}
                onPress={analyzeCode}
                disabled={loading || !codeInput.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="analytics" size={18} color="#000" />
                    <Text style={styles.actionText}>ANALIZAR</Text>
                  </>
                )}
              </TouchableOpacity>

              {analysis && (
                <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>
                    {analysis.success ? '✅ ANÁLISIS COMPLETADO' : '❌ ERROR DE SINTAXIS'}
                  </Text>
                  {analysis.syntax_error ? (
                    <Text style={styles.syntaxError}>{analysis.syntax_error}</Text>
                  ) : (
                    <>
                      <ResultRow label="Líneas de código" value={String(analysis.lines_of_code)} />
                      <ResultRow label="Complejidad" value={String(analysis.complexity)} />
                      <ResultRow label="Imports" value={String(analysis.total_imports || 0)} />
                      {analysis.imports.length > 0 && (
                        <Text style={styles.listText}>{analysis.imports.join(', ')}</Text>
                      )}
                      <ResultRow label="Funciones" value={String(analysis.total_functions || 0)} />
                      {analysis.functions.length > 0 && (
                        <Text style={styles.listText}>{analysis.functions.join(', ')}</Text>
                      )}
                      <ResultRow label="Clases" value={String(analysis.total_classes || 0)} />
                      {analysis.classes.length > 0 && (
                        <Text style={styles.listText}>{analysis.classes.join(', ')}</Text>
                      )}
                    </>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.label}>COMANDO PARA EVALUAR</Text>
              <TextInput
                testID="risk-input"
                style={styles.commandInput}
                value={commandInput}
                onChangeText={setCommandInput}
                placeholder="Ej: rm -rf /tmp/test"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                testID="evaluate-risk-btn"
                style={[styles.actionBtn, !commandInput.trim() && styles.btnDisabled]}
                onPress={evaluateRisk}
                disabled={loading || !commandInput.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#000" />
                    <Text style={styles.actionText}>EVALUAR RIESGO</Text>
                  </>
                )}
              </TouchableOpacity>

              {riskResult && (
                <View style={[styles.resultCard, { borderColor: getRiskColor(riskResult.risk_level) }]}>
                  <View style={styles.riskHeader}>
                    <Ionicons name="shield" size={24} color={getRiskColor(riskResult.risk_level)} />
                    <Text style={[styles.riskLevel, { color: getRiskColor(riskResult.risk_level) }]}>
                      {riskResult.risk_level}
                    </Text>
                  </View>
                  <Text style={styles.riskDesc}>{riskResult.description}</Text>
                  <Text style={styles.riskCmd}>$ {riskResult.command}</Text>
                  {riskResult.requires_confirmation && (
                    <View style={styles.confirmBadge}>
                      <Ionicons name="warning" size={14} color={COLORS.warning} />
                      <Text style={styles.confirmText}>Requiere confirmación del usuario</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  label: { fontSize: 13, color: COLORS.textSecondary },
  value: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, fontFamily: FONTS.mono },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.primary, letterSpacing: 3 },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textDim, letterSpacing: 2 },
  tabTextActive: { color: COLORS.primary },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 8 },
  codeInput: {
    backgroundColor: COLORS.termBg, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.termText, fontFamily: FONTS.mono, fontSize: 13,
    padding: 12, minHeight: 200, textAlignVertical: 'top',
  },
  commandInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, fontFamily: FONTS.mono, fontSize: 14,
    padding: 12, height: 48,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, padding: 14, gap: 8, marginTop: 12,
  },
  btnDisabled: { opacity: 0.4 },
  actionText: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 2 },
  resultCard: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginTop: 16,
  },
  resultTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  syntaxError: { fontSize: 13, color: COLORS.error, fontFamily: FONTS.mono },
  listText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: FONTS.mono, paddingLeft: 8, marginBottom: 4 },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  riskLevel: { fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  riskDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  riskCmd: { fontSize: 13, fontFamily: FONTS.mono, color: COLORS.primary, backgroundColor: COLORS.termBg, padding: 8 },
  confirmBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  confirmText: { fontSize: 12, color: COLORS.warning },
  errorCard: { backgroundColor: 'rgba(255,69,58,0.1)', borderWidth: 1, borderColor: COLORS.error, padding: 12, marginTop: 16 },
  errorText: { fontSize: 13, color: COLORS.error },
});
