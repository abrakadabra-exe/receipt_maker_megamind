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
import logoUrl from '../assets/megamind-logo.png'
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

const NAVY = '#1b2a4a'
const NAVY_LIGHT = '#f2f5fa'
const GOLD = '#c9a227'
const GOLD_DARK = '#a37f1f'
const GRAY = '#6b7280'
const LINE = '#d7dee9'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: '#1f2430',
    padding: 36,
    paddingBottom: 78,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: { width: 122, marginBottom: 6 },
  brandName: { fontSize: 19, fontWeight: 700, color: NAVY, letterSpacing: 0.4 },
  tagline: { fontSize: 8.5, color: GOLD_DARK, fontWeight: 600, marginTop: 1 },
  headerContact: { fontSize: 7.5, color: GRAY, marginTop: 6 },
  invoiceTitle: { fontSize: 21, fontWeight: 700, color: NAVY, textAlign: 'right', letterSpacing: 1 },
  typeBadge: {
    alignSelf: 'flex-end',
    backgroundColor: GOLD,
    color: '#fff',
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
  metaLabel: { fontSize: 7.5, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 10, textAlign: 'right', width: 62 },
  metaValue: { fontSize: 8.5, color: NAVY, fontWeight: 600, width: 110, textAlign: 'right' },
  goldRule: { height: 2.2, backgroundColor: GOLD, marginTop: 14 },
  navyRule: { height: 0.6, backgroundColor: NAVY, opacity: 0.25, marginTop: 1.5 },
  billedTo: { marginTop: 16 },
  sectionLabel: { fontSize: 7.5, color: GOLD_DARK, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  clientName: { fontSize: 10.5, fontWeight: 700, color: NAVY },
  clientSub: { fontSize: 8.5, color: GRAY, marginTop: 1.5 },
  table: { marginTop: 14, borderWidth: 0.75, borderColor: LINE, borderRadius: 3, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', backgroundColor: NAVY, paddingVertical: 6.5, paddingHorizontal: 8 },
  headCell: { color: '#ffffff', fontSize: 6.8, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 0.5, borderTopColor: LINE },
  rowAlt: { backgroundColor: NAVY_LIGHT },
  cell: { fontSize: 8.3 },
  cellBold: { fontSize: 8.3, fontWeight: 600 },
  cellRight: { textAlign: 'right' },
  warranty: { fontSize: 7, color: GOLD_DARK, fontWeight: 600, marginTop: 1.5 },
  workDone: {
    marginTop: 10,
    borderLeftWidth: 2.5,
    borderLeftColor: GOLD,
    backgroundColor: NAVY_LIGHT,
    padding: 8,
    borderRadius: 2,
  },
  workLabel: { fontSize: 7.5, color: GOLD_DARK, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  workText: { fontSize: 8.3, color: '#333a48', lineHeight: 1.45 },
  totalsWrap: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  totalsBox: { width: 248 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalRowText: { fontSize: 8.5, color: '#4b5563' },
  totalRowValue: { fontSize: 8.5, fontWeight: 600, color: NAVY },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: NAVY, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 3, marginTop: 5 },
  grandLabel: { color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 0.6 },
  grandValue: { color: '#fff', fontSize: 10.5, fontWeight: 700 },
  words: { marginTop: 6, fontSize: 7.8, fontStyle: 'italic', color: '#4b5563' },
  bottomBlock: { marginTop: 16, flexDirection: 'row', gap: 14 },
  infoCol: { flex: 1, borderWidth: 0.75, borderColor: LINE, borderRadius: 3, padding: 8 },
  infoLabel: { fontSize: 7, color: GOLD_DARK, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  infoText: { fontSize: 8.3, color: '#333a48', lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 36,
    right: 36,
    borderTopWidth: 1.6,
    borderTopColor: GOLD,
    paddingTop: 8,
    alignItems: 'center',
  },
  footerLabel: { fontSize: 7, color: GRAY, letterSpacing: 1.6, textTransform: 'uppercase' },
  footerContact: { fontSize: 8.6, color: NAVY, fontWeight: 600, marginTop: 2 },
  footerThanks: { fontSize: 7.6, fontStyle: 'italic', color: GRAY, marginTop: 2 },
  footerPage: { fontSize: 7, color: GRAY, marginTop: 2 },
})

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
    { key: 'unitPrice', label: 'Unit Price (BDT)', flex: 1.6, right: true },
    { key: 'tax', label: 'Tax', flex: 1.2, right: true },
    { key: 'total', label: 'Total (BDT)', flex: 1.6, right: true },
  ],
  product: [
    { key: 'desc', label: 'Description', flex: 3.9 },
    { key: 'qty', label: 'Qty', flex: 1 },
    { key: 'unitPrice', label: 'Unit Price (BDT)', flex: 1.5, right: true },
    { key: 'warranty', label: 'Warranty', flex: 1.2 },
    { key: 'tax', label: 'Tax', flex: 1.1, right: true },
    { key: 'total', label: 'Total (BDT)', flex: 1.5, right: true },
  ],
  repair: [
    { key: 'kind', label: 'Type', flex: 1.1 },
    { key: 'desc', label: 'Description', flex: 3.6 },
    { key: 'qty', label: 'Qty', flex: 0.9 },
    { key: 'unitPrice', label: 'Unit Price (BDT)', flex: 1.5, right: true },
    { key: 'tax', label: 'Tax', flex: 1.1, right: true },
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

function InvoiceTable({ invoice }) {
  const cols = COLUMNS[invoice.type]
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        {cols.map((c) => (
          <Text
            key={c.key}
            style={[styles.headCell, { flex: c.flex, textAlign: c.right ? 'right' : 'left' }]}
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
              <View key={c.key} style={{ flex: c.flex }}>
                <Text style={[c.right ? styles.cellRight : null, isDesc ? styles.cellBold : styles.cell]}>
                  {cellValue(item, c.key)}
                </Text>
                {isDesc && invoice.type === 'product' && item.warranty && (
                  <Text style={styles.warranty}>Warranty: {item.warranty}</Text>
                )}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function InvoiceDoc({ invoice }) {
  const meta = typeMeta(invoice.type)
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Image src={logoUrl} style={styles.logo} />
            <Text style={styles.brandName}>{COMPANY.name}</Text>
            <Text style={styles.tagline}>{COMPANY.tagline}</Text>
            <Text style={styles.headerContact}>
              {COMPANY.phone}  ·  {COMPANY.email}
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.typeBadge}><Text>{meta.label.toUpperCase()}</Text></View>
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

        <InvoiceTable invoice={invoice} />

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
          <Text style={styles.footerLabel}>For Any Queries Contact</Text>
          <Text style={styles.footerContact}>{COMPANY.phone}  ·  {COMPANY.email}</Text>
          <Text style={styles.footerThanks}>Thank you for your business.</Text>
          <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export default InvoiceDoc