import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { buildInvoiceHtml } from "../../utils/invoice";
import { colors, radius } from "../../constants/theme";

export default function InvoicePreviewModal({
  visible,
  invoiceData,
  onClose,
  onSaveOrShare,
  saving = false,
  viewOnly = false,
  showDownload = false,
}) {
  const html = invoiceData ? buildInvoiceHtml(invoiceData) : "";
  const title = viewOnly || showDownload ? "Invoice" : "Invoice Preview";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {!viewOnly && !showDownload ? (
          <Text style={styles.subtitle}>
            Review your invoice before saving to files, gallery, or sharing.
          </Text>
        ) : null}

        <View
          style={[
            styles.previewFrame,
            (viewOnly || showDownload) && styles.previewFrameExpanded,
          ]}
        >
          {html ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html }}
              style={styles.webview}
              scrollEnabled
            />
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        </View>

        {showDownload ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={onSaveOrShare}
              disabled={saving || !invoiceData}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Download Invoice</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {!viewOnly && !showDownload ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={onSaveOrShare}
              disabled={saving || !invoiceData}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save / Share PDF</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>Back to Payment</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  closeText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 24,
    marginBottom: 16,
    lineHeight: 20,
  },
  previewFrame: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewFrameExpanded: {
    marginTop: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: colors.white,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
