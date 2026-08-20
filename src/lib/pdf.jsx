import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import InterRegular from '../assets/fonts/Inter-Regular.ttf'
import InterMedium from '../assets/fonts/Inter-Medium.ttf'
import InterSemiBold from '../assets/fonts/Inter-SemiBold.ttf'
import InterBold from '../assets/fonts/Inter-Bold.ttf'
import InterItalic from '../assets/fonts/Inter-Italic.ttf'
import logoUrl from '../assets/megamind-logo-white.png'
import { bdt, amountInWords } from './money'
import { typeMeta } from './numbers'

Font.register({
  family: 'Inter',
  fonts: [
    { src: InterRegular, fontWeight: 400, fontStyle: 'normal' },
    { src: InterItalic, fontWeight: 400, fontStyle: 'italic' },
    { src: InterMedium, fontWeight: 500, fontStyle: 'normal' },
    { src: InterSemiBold, fontWeight: 600, fontStyle: 'normal' },
    { src: InterBold, fontWeight: 700, fontStyle: 'normal' },
  ],
})

export const COMPANY = {
  name: 'Megamind BD',
  tagline: 'Digital Marketing & IT Solutions',
  phone: '+880199289339',
  email: 'megamindbd.official@gmail.com',
}

const C = {
  PURPLE: '#111111',
  ORANGE: '#111111',
  ORANGE_DARK: '#111111',
  NAVY: '#111111',
  NAVY_LIGHT: '#f2f2f2',
  GRAY: '#555555',
  LINE: '#cccccc',
  pageText: '#111111',
  workText: '#111111',
  totalText: '#111111',
  bandContact: '#d9d9d9',
  badgeBg: '#ffffff',
  badgeText: '#111111',
  cancel: 'rgba(17, 17, 17, 0.6)',
}

function makeStyles() {
  return StyleSheet.create({
    page: {
      fontFamily: 'Inter',
      fontSize: 9,
      color: C.pageText,
      padding: 36,
      paddingBottom: 78,
    },
    headerBand: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: C.PURPLE,
      borderRadius: 4,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    logoChip: { backgroundColor: '#ffffff', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 6 },
    logo: { width: 104 },
    bandRight: { alignItems: 'flex-end' },
    bandTitle: { color: '#ffffff', fontSize: 17, fontWeight: 700, letterSpacing: 2 },
    bandContact: { color: C.bandContact, fontSize: 6.8, marginTop: 4 },
    invoiceTitle: { fontSize: 21, fontWeight: 700, color: C.NAVY, textAlign: 'right', letterSpacing: 1 },
    typeBadge: {
      alignSelf: 'flex-end',
      backgroundColor: C.badgeBg,
      color: C.badgeText,
      fontSize: 7,
      fontWeight: 700,
      letterSpacing: 1.2,
      paddingVertical: 2.5,
      paddingHorizontal: 7,
      borderRadius: 2,
      marginTop: 3,
    },
    metaBox: { marginTop: 8, alignSelf: 'flex-end' },
    metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
    metaLabel: { fontSize: 7.5, color: C.GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 10, textAlign: 'right', width: 62 },
    metaValue: { fontSize: 8.5, color: C.NAVY, fontWeight: 600, width: 110, textAlign: 'right' },
    goldRule: { height: 2.2, backgroundColor: C.ORANGE, marginTop: 14 },
    navyRule: { height: 0.6, backgroundColor: C.NAVY, opacity: 0.25, marginTop: 1.5 },
    billedTo: { marginTop: 16 },
    sectionLabel: { fontSize: 7.5, color: C.ORANGE_DARK, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
    clientName: { fontSize: 10.5, fontWeight: 700, color: C.NAVY },
    clientSub: { fontSize: 8.5, color: C.GRAY, marginTop: 1.5 },
    table: { marginTop: 14, borderWidth: 0.75, borderColor: C.LINE, borderRadius: 3, overflow: 'hidden' },
    tableHead: { flexDirection: 'row', backgroundColor: C.NAVY, paddingVertical: 6.5, paddingHorizontal: 8 },
    headCell: { color: '#ffffff', fontSize: 6.8, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' },
    row: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 0.5, borderTopColor: C.LINE },
    rowAlt: { backgroundColor: C.NAVY_LIGHT },
    cell: { fontSize: 8.3 },
    cellBold: { fontSize: 8.3, fontWeight: 600 },
    cellRight: { textAlign: 'right' },
    cellCenter: { textAlign: 'center' },
    warranty: { fontSize: 7, color: C.ORANGE_DARK, fontWeight: 600, marginTop: 1.5 },
    workDone: {
      marginTop: 10,
      borderLeftWidth: 2.5,
      borderLeftColor: C.ORANGE,
      backgroundColor: C.NAVY_LIGHT,
      padding: 8,
      borderRadius: 2,
    },
    workLabel: { fontSize: 7.5, color: C.ORANGE_DARK, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
    workText: { fontSize: 8.3, color: C.workText, lineHeight: 1.45 },
    totalsWrap: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
    totalsBox: { width: 248 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
    totalRowText: { fontSize: 8.5, color: C.totalText },
    totalRowValue: { fontSize: 8.5, fontWeight: 600, color: C.NAVY },
    grandRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.NAVY, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 3, marginTop: 5 },
    grandLabel: { color: '#ffffff', fontSize: 9, fontWeight: 700, letterSpacing: 0.6 },
    grandValue: { color: '#ffffff', fontSize: 10.5, fontWeight: 700 },
    words: { marginTop: 6, fontSize: 7.8, fontStyle: 'italic', color: C.totalText },
    bottomBlock: { marginTop: 16, flexDirection: 'row', gap: 14 },
    infoCol: { flex: 1, borderWidth: 0.75, borderColor: C.LINE, borderRadius: 3, padding: 8 },
    infoLabel: { fontSize: 7, color: C.ORANGE_DARK, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
    infoText: { fontSize: 8.3, color: C.workText, lineHeight: 1.4 },
    footer: {
      position: 'absolute',
      bottom: 28,
      left: 36,
      right: 36,
      borderTopWidth: 1.6,
      borderTopColor: C.ORANGE,
      paddingTop: 8,
      alignItems: 'center',
    },
    footerThanks: { fontSize: 7.6, fontStyle: 'italic', color: C.GRAY, marginTop: 2 },
    footerPage: { fontSize: 7, color: C.GRAY, marginTop: 2 },
    cancelledStamp: {
      position: 'absolute',
      top: 300,
      left: 0,
      right: 0,
      alignItems: 'center',
      transform: 'rotate(-30deg)',
    },
    cancelledText: {
      fontSize: 40,
      fontWeight: 700,
      color: C.cancel,
      letterSpacing: 6,
      borderWidth: 3.5,
      borderColor: C.cancel,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 22,
    },
  })
}

function fmtDate(d) {
  if (!d) return '—'
  const date = new Date(`${d}T00:00:00`)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()
}

const COLUMNS = {
  service: [
    { key: 'desc', label: 'Description', flex: 4.6 },
    { key: 'qty', label: 'Qty', flex: 1.1, right: true },
    { key: 'unitPrice', label: 'Unit Price (BDT)', flex: 1.8, right: true },
    { key: 'total', label: 'Total (BDT)', flex: 1.8, right: true },
  ],
  product: [
    { key: 'desc', label: 'Description', flex: 3.9 },
    { key: 'qty', label: 'Qty', flex: 1 },
    { key: 'unitPrice', label: 'Unit Price (BDT)', flex: 1.8, right: true },
    { key: 'warranty', label: 'Warranty', flex: 2, center: true },
    { key: 'total', label: 'Total (BDT)', flex: 1.5, right: true },
  ],
  repair: [
    { key: 'kind', label: 'Type', flex: 1.1 },
    { key: 'desc', label: 'Description', flex: 3.4 },
    { key: 'qty', label: 'Qty', flex: 0.9 },
    { key: 'unitPrice', label: 'Unit Price (BDT)', flex: 1.6, right: true },
    { key: 'warranty', label: 'Warranty', flex: 1.5, center: true },
    { key: 'total', label: 'Total (BDT)', flex: 1.5, right: true },
  ],
}

function cellValue(item, key) {
  switch (key) {
    case 'desc': return item.desc
    case 'qty': return item.qty
    case 'unitPrice': return bdt(item.unitPrice)
    case 'tax': return `${item.taxPct || 0}%`
    case 'total': return bdt(item.total)
    case 'warranty': return item.warranty || '—'
    case 'kind': return item.kind === 'parts' ? 'PARTS' : 'LABOUR'
    default: return ''
  }
}

function InvoiceTable({ invoice, styles }) {
  const cols = COLUMNS[invoice.type]
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        {cols.map((c) => (
          <Text
            key={c.key}
            style={[styles.headCell, { flex: c.flex, textAlign: c.right ? 'right' : c.center ? 'center' : 'left', paddingHorizontal: 4 }]}
          >
            {c.label}
          </Text>
        ))}
      </View>
      {invoice.items.map((item, idx) => (
        <View key={idx} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
          {cols.map((c) => {
            const isDesc = c.key === 'desc'
            return (
              <View key={c.key} style={{ flex: c.flex, paddingHorizontal: 4 }}>
                <Text style={[c.right ? styles.cellRight : c.center ? styles.cellCenter : null, isDesc ? styles.cellBold : styles.cell]}>
                  {cellValue(item, c.key)}
                </Text>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function InvoiceDoc({ invoice, profile }) {
  const styles = makeStyles()
  const meta = typeMeta(invoice.type)
  const p = profile || {
    logoSrc: logoUrl,
    logoOnDark: true,
    phone: COMPANY.phone,
    email: COMPANY.email,
  }
  const bandContact = [p.phone, p.email].filter(Boolean).join('  ·  ')
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {invoice.status === 'cancelled' && (
          <View style={styles.cancelledStamp} fixed>
            <Text style={styles.cancelledText}>CANCELLED</Text>
          </View>
        )}
        <View style={styles.headerBand}>
          {p.logoOnDark ? (
            <Image src={p.logoSrc} style={styles.logo} />
          ) : (
            <View style={styles.logoChip}>
              <Image src={p.logoSrc} style={styles.logo} />
            </View>
          )}
          <View style={styles.bandRight}>
            <Text style={styles.bandTitle}>INVOICE</Text>
            <View style={styles.typeBadge}><Text>{meta.label.toUpperCase()}</Text></View>
            <Text style={styles.bandContact}>{bandContact}</Text>
          </View>
        </View>
        <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice No</Text>
                <Text style={styles.metaValue}>{invoice.number}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Issue Date</Text>
                <Text style={styles.metaValue}>{fmtDate(invoice.date)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date</Text>
                <Text style={styles.metaValue}>{fmtDate(invoice.dueDate)}</Text>
              </View>
            </View>

        <View style={styles.goldRule} />
        <View style={styles.navyRule} />

        <View style={styles.billedTo}>
          <Text style={styles.sectionLabel}>Billed To</Text>
          <Text style={styles.clientName}>{invoice.client.name || '—'}</Text>
          {invoice.client.phone ? <Text style={styles.clientSub}>{invoice.client.phone}</Text> : null}
          {invoice.client.address ? <Text style={styles.clientSub}>{invoice.client.address}</Text> : null}
        </View>

        {invoice.type === 'repair' && (
          <View style={styles.workDone}>
            <Text style={styles.workLabel}>Repair Details</Text>
            <Text style={styles.workText}>
              {[
                invoice.repair?.device && `Device / Unit: ${invoice.repair.device}`,
                invoice.repair?.complaint && `Reported Issue: ${invoice.repair.complaint}`,
                invoice.repair?.workDone && `Work Performed: ${invoice.repair.workDone}`,
              ].filter(Boolean).join('   |   ')}
            </Text>
          </View>
        )}

        <InvoiceTable invoice={invoice} styles={styles} />

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalRowText}>Subtotal</Text>
              <Text style={styles.totalRowValue}>{bdt(invoice.subtotal)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalRowText}>Discount</Text>
                <Text style={styles.totalRowValue}>- {bdt(invoice.discount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalRowText}>Tax</Text>
              <Text style={styles.totalRowValue}>{bdt(invoice.taxTotal)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Grand Total (BDT)</Text>
              <Text style={styles.grandValue}>{bdt(invoice.total)}</Text>
            </View>
            <Text style={styles.words}>In words: {amountInWords(invoice.total)}</Text>
          </View>
        </View>

        <View style={styles.bottomBlock}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoText}>{invoice.paymentMethod || '—'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Notes</Text>
            <Text style={styles.infoText}>{invoice.notes || '—'}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerThanks}>Thank you for your business.</Text>
          <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export default InvoiceDoc