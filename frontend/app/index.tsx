import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BACKEND_URL } from '../constants/theme';

type ModelInfo = {
  primary_model: { name: string; downloaded: boolean; loaded: boolean; size_mb: number; path: string };
  ollama_model: { name: string; available: boolean; installed: boolean };
  llama_cpp_installed: boolean;
  load_error: string | null;
  download_instructions: Record<string, string>;
  models_dir: string;
};

export default function StatusScreen() {
  const [status, setStatus] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      setError('');
      const res = await fetch(`${BACKEND_URL}/api/models/status`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setError('No se pudo conectar al servidor');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const onRefresh = () => { setRefreshing(true); fetchStatus(); };

  const reloadModels = async () => {
    setReloading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/models/reload`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      } else {
        setError(data.message || 'Error al recargar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setReloading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>JARVISCO</Text>
          <Text style={styles.subtitle}>COPILOTO IA OFFLINE</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Primary Model */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>MODELO PRIMARIO</Text>
            <View style={[styles.statusDot, { backgroundColor: status?.primary_model.loaded ? COLORS.success : status?.primary_model.downloaded ? COLORS.warning : COLORS.error }]} />
          </View>
          <Text style={styles.modelName}>{status?.primary_model.name || 'N/A'}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Descargado</Text>
            <Text style={[styles.infoValue, { color: status?.primary_model.downloaded ? COLORS.success : COLORS.error }]}>
              {status?.primary_model.downloaded ? 'SÍ' : 'NO'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cargado</Text>
            <Text style={[styles.infoValue, { color: status?.primary_model.loaded ? COLORS.success : COLORS.error }]}>
              {status?.primary_model.loaded ? 'SÍ' : 'NO'}
            </Text>
          </View>
          {status?.primary_model.size_mb ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tamaño</Text>
              <Text style={styles.infoValue}>{status.primary_model.size_mb} MB</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>llama-cpp-python</Text>
            <Text style={[styles.infoValue, { color: status?.llama_cpp_installed ? COLORS.success : COLORS.error }]}>
              {status?.llama_cpp_installed ? 'INSTALADO' : 'NO INSTALADO'}
            </Text>
          </View>
          {status?.load_error ? (
            <Text style={styles.errorSmall}>{status.load_error}</Text>
          ) : null}
        </View>

        {/* Ollama Model */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>MODELO AVANZADO (OLLAMA)</Text>
            <View style={[styles.statusDot, { backgroundColor: status?.ollama_model.available ? COLORS.success : COLORS.error }]} />
          </View>
          <Text style={styles.modelName}>{status?.ollama_model.name || 'N/A'}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ollama instalado</Text>
            <Text style={[styles.infoValue, { color: status?.ollama_model.installed ? COLORS.success : COLORS.error }]}>
              {status?.ollama_model.installed ? 'SÍ' : 'NO'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Modelo disponible</Text>
            <Text style={[styles.infoValue, { color: status?.ollama_model.available ? COLORS.success : COLORS.error }]}>
              {status?.ollama_model.available ? 'SÍ' : 'NO'}
            </Text>
          </View>
        </View>

        {/* Download Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>INSTRUCCIONES DE DESCARGA</Text>
          <Text style={styles.instructionLabel}>1. Instalar llama-cpp-python:</Text>
          <View style={styles.codeBlock}>
            <Text testID="instruction-llama" style={styles.codeText}>{status?.download_instructions?.llama_cpp || 'pip install llama-cpp-python'}</Text>
          </View>
          <Text style={styles.instructionLabel}>2. Descargar modelo primario:</Text>
          <View style={styles.codeBlock}>
            <Text testID="instruction-primary" style={styles.codeText}>{status?.download_instructions?.primary || ''}</Text>
          </View>
          <Text style={styles.instructionLabel}>3. Instalar Ollama (opcional):</Text>
          <View style={styles.codeBlock}>
            <Text testID="instruction-ollama-install" style={styles.codeText}>{status?.download_instructions?.ollama_install || ''}</Text>
          </View>
          <Text style={styles.instructionLabel}>4. Descargar modelo avanzado:</Text>
          <View style={styles.codeBlock}>
            <Text testID="instruction-ollama-model" style={styles.codeText}>{status?.download_instructions?.ollama_model || ''}</Text>
          </View>
        </View>

        {/* Reload Button */}
        <TouchableOpacity
          testID="reload-models-btn"
          style={styles.reloadBtn}
          onPress={reloadModels}
          disabled={reloading}
        >
          {reloading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="reload" size={18} color="#000" />
              <Text style={styles.reloadText}>RECARGAR MODELOS</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ruta modelos: {status?.models_dir || '~/.jarvisco/models'}</Text>
          <Text style={styles.footerText}>Autor: Sergio Alberto Sanchez Echeverria</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  logo: { fontSize: 32, fontWeight: '900', color: COLORS.primary, letterSpacing: 6 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 3, marginTop: 4 },
  versionBadge: { marginTop: 8, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 2 },
  versionText: { fontSize: 10, color: COLORS.primary, fontFamily: FONTS.mono },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 2 },
  statusDot: { width: 10, height: 10 },
  modelName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, fontFamily: FONTS.mono, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, fontFamily: FONTS.mono },
  errorSmall: { fontSize: 11, color: COLORS.error, marginTop: 8, fontFamily: FONTS.mono },
  errorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,69,58,0.1)', borderWidth: 1, borderColor: COLORS.error, padding: 12, marginBottom: 16, gap: 8 },
  errorText: { fontSize: 13, color: COLORS.error, flex: 1 },
  instructionLabel: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  codeBlock: { backgroundColor: COLORS.termBg, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  codeText: { fontSize: 11, color: COLORS.termText, fontFamily: FONTS.mono },
  reloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: 14, gap: 8, marginTop: 8 },
  reloadText: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 2 },
  footer: { marginTop: 24, alignItems: 'center', gap: 4 },
  footerText: { fontSize: 10, color: COLORS.textDim, fontFamily: FONTS.mono },
});
