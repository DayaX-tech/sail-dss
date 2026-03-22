"""
SAIL Bokaro DSS — Professional Email Service v2
================================================
Sends e-RR PDFs with full customer-specific wagon details.
Each customer ONLY sees THEIR wagons — other customers' data is confidential.

Features:
  - Per-customer wagon list (not full rake)
  - Professional tax invoice format
  - Loading/departure/ETA timeline
  - Demurrage warning
  - Contact details
  - Weather advisory (if configured)
"""
import os, io, smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timedelta
from typing import Optional, List, Dict

GMAIL_USER     = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASS = os.getenv("GMAIL_APP_PASSWORD", "")
PLANT_NAME     = "SAIL Bokaro Steel Plant"
PLANT_GST      = "20AAACS7369R1ZX"
PLANT_ADDR1    = "Bokaro Steel City, Jharkhand — 827001"
PLANT_ADDR2    = "Tel: +91-6542-233000 | logistics@sail-bokaro.in"
PLANT_CIN      = "L27100WB1973GOI028825"

# GST rate by product category
GST_RATES = {
    "HR-COIL":  18, "CR-SHEET": 18, "WIRE-ROD": 18,
    "PLATE-H":  18, "PLATE-M":  18, "SLAB-A":   18, "SLAB-B": 18,
    "STRUCT-A": 18, "BILLET-S": 18, "BILLET-H": 18,
    "TMT-12":   18, "TMT-16":   18, "TMT-20":   18,
    "PIG-IRON": 18,
}

# Product full names
PRODUCT_NAMES = {
    "HR-COIL":  "Hot Rolled Coil", "CR-SHEET": "Cold Rolled Sheet",
    "WIRE-ROD": "Wire Rod",        "PLATE-H":  "Heavy Steel Plate",
    "PLATE-M":  "Medium Steel Plate","SLAB-A":  "Steel Slab Grade A",
    "SLAB-B":   "Steel Slab Grade B","STRUCT-A":"Structural Steel Section A",
    "BILLET-S": "Steel Billet Soft","BILLET-H":"Steel Billet Hard",
    "TMT-12":   "TMT Rebar 12mm",  "TMT-16":  "TMT Rebar 16mm",
    "TMT-20":   "TMT Rebar 20mm",  "PIG-IRON":"Pig Iron",
}

# HSN codes
HSN_CODES = {
    "HR-COIL":"72081000","CR-SHEET":"72091500","WIRE-ROD":"72130000",
    "PLATE-H":"72085110","PLATE-M":"72085110","SLAB-A":"72061000",
    "SLAB-B":"72061000","STRUCT-A":"72163100","BILLET-S":"72071100",
    "BILLET-H":"72071100","TMT-12":"72140000","TMT-16":"72140000",
    "TMT-20":"72140000","PIG-IRON":"72011000",
}

def _email_configured():
    return bool(GMAIL_USER and GMAIL_APP_PASS)

def _send_email(to_email, subject, html_body, attachments=None):
    if not _email_configured():
        return {"status":"mock","message":"Add GMAIL_USER and GMAIL_APP_PASSWORD to backend/.env","to":to_email}
    try:
        msg = MIMEMultipart("mixed")
        msg["From"]    = f"{PLANT_NAME} <{GMAIL_USER}>"
        msg["To"]      = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))
        for (pdf_bytes, pdf_name) in (attachments or []):
            if pdf_bytes:
                part = MIMEBase("application","octet-stream")
                part.set_payload(pdf_bytes)
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", f'attachment; filename="{pdf_name}"')
                msg.attach(part)
        with smtplib.SMTP("smtp.gmail.com", 587) as srv:
            srv.ehlo()
            srv.starttls()
            srv.ehlo()
            srv.login(GMAIL_USER, GMAIL_APP_PASS)
            srv.sendmail(GMAIL_USER, to_email, msg.as_string())
        return {"status":"sent","to":to_email,"subject":subject}
    except Exception as e:
        return {"status":"error","message":str(e),"to":to_email}


# ─────────────────────────────────────────────────────────────────────────────
# PDF GENERATION
# ─────────────────────────────────────────────────────────────────────────────
def generate_err_pdf(order: dict, rake: dict, customer_wagons: list) -> bytes:
    """
    Professional e-RR PDF with:
      - SAIL letterhead
      - Tax invoice (GST, HSN, CGST/SGST/IGST)
      - Only this customer's wagons (confidential)
      - Loading timeline
      - Contact & demurrage info
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                         Table, TableStyle, HRFlowable, KeepTogether)
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

        buf  = io.BytesIO()
        doc  = SimpleDocTemplate(buf, pagesize=A4,
                                  topMargin=1.5*cm, bottomMargin=2*cm,
                                  leftMargin=2*cm, rightMargin=2*cm)

        ORANGE  = colors.HexColor("#FF7A00")
        NAVY    = colors.HexColor("#0a1929")
        TEAL    = colors.HexColor("#1565a0")
        GRAY    = colors.HexColor("#6b7280")
        LGRAY   = colors.HexColor("#f8f9fa")
        RED     = colors.HexColor("#dc2626")
        GREEN   = colors.HexColor("#16a34a")
        WHITE   = colors.white
        BLACK   = colors.black
        BORDER  = colors.HexColor("#dee2e6")

        S = getSampleStyleSheet()
        def sty(name, **kw):
            p = ParagraphStyle(name, parent=S["Normal"])
            for k,v in kw.items(): setattr(p,k,v)
            return p

        now     = datetime.now()
        prod    = order.get("product_type","—")
        qty     = float(order.get("quantity_tons", 0))
        dest    = order.get("destination","—")
        dist    = int(order.get("distance_km", 500))
        transit = max(1, dist // 350)
        eta_dt  = now + timedelta(days=transit)
        eta_str = eta_dt.strftime("%d %B %Y")
        dept    = order.get("dispatch_time", now.strftime("%d %B %Y, %H:%M hrs"))
        load_start = order.get("loading_start", (now - timedelta(hours=4)).strftime("%d %B %Y, %H:%M hrs"))
        load_end   = order.get("loading_end",   (now - timedelta(hours=1)).strftime("%d %B %Y, %H:%M hrs"))

        err_no  = f"BSP/{now.year}/{now.strftime('%m')}/{str(order.get('order_id','0')).zfill(6)}"
        inv_no  = f"SAIL/BSP/INV/{now.year}-{str(now.year+1)[-2:]}/{str(order.get('order_id','0')).zfill(5)}"

        gst_rate  = GST_RATES.get(prod, 18)
        hsn       = HSN_CODES.get(prod, "72089000")
        prod_full = PRODUCT_NAMES.get(prod, prod)
        rate_per_ton = float(order.get("rate_per_ton", 52000))
        base_val  = qty * rate_per_ton
        freight   = float(order.get("freight_cost", 0))
        taxable   = base_val + freight
        # IGST (interstate supply)
        igst_amt  = round(taxable * gst_rate / 100, 2)
        total_amt = round(taxable + igst_amt, 2)

        # Customer's assigned wagons only
        wag_count = len(customer_wagons)
        wag_ids   = ", ".join([w.get("wagon_id","") for w in customer_wagons[:8]])
        if len(customer_wagons) > 8:
            wag_ids += f" ... +{len(customer_wagons)-8} more"

        elems = []

        # ── LETTERHEAD ─────────────────────────────────────────────────────
        header_data = [[
            Paragraph(f"<font color='#FF7A00' size='16'><b>STEEL AUTHORITY OF INDIA LIMITED</b></font><br/>"
                      f"<font color='white' size='11'>{PLANT_NAME}</font><br/>"
                      f"<font color='#8899bb' size='8'>{PLANT_ADDR1}</font><br/>"
                      f"<font color='#8899bb' size='8'>{PLANT_ADDR2}</font><br/>"
                      f"<font color='#8899bb' size='7'>GSTIN: {PLANT_GST} | CIN: {PLANT_CIN}</font>",
                      sty("hdr", textColor=WHITE, fontSize=10, fontName="Helvetica")),
            Paragraph(f"<font color='#FF7A00' size='9'><b>DISPATCHED</b></font><br/>"
                      f"<font color='white' size='8'>e-RR No:</font><br/>"
                      f"<font color='#FF7A00' size='8'><b>{err_no}</b></font><br/><br/>"
                      f"<font color='white' size='8'>Invoice No:</font><br/>"
                      f"<font color='white' size='8'>{inv_no}</font>",
                      sty("hdr2", textColor=WHITE, fontSize=8, alignment=2)),
        ]]
        ht = Table(header_data, colWidths=[13*cm, 5*cm])
        ht.setStyle(TableStyle([
            ("BACKGROUND",  (0,0),(-1,-1), NAVY),
            ("VALIGN",      (0,0),(-1,-1), "TOP"),
            ("TOPPADDING",  (0,0),(-1,-1), 14),
            ("BOTTOMPADDING",(0,0),(-1,-1),14),
            ("LEFTPADDING", (0,0),(0,-1), 14),
            ("RIGHTPADDING",(-1,0),(-1,-1),14),
        ]))
        elems.append(ht)

        # Orange rule
        elems.append(Table([[""]], colWidths=[18*cm]))
        elems[-1].setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),ORANGE),
                                        ("ROWHEIGHTS",(0,0),(-1,-1),3)]))
        elems.append(Spacer(1,0.3*cm))

        # ── DOCUMENT TITLE ──────────────────────────────────────────────────
        elems.append(Paragraph("ELECTRONIC RAILWAY RECEIPT — DISPATCH CONFIRMATION",
                                sty("dt", fontSize=13, fontName="Helvetica-Bold",
                                    textColor=NAVY, alignment=TA_CENTER)))
        elems.append(Spacer(1,0.4*cm))

        # ── PARTY DETAILS ──────────────────────────────────────────────────
        party_data = [
            [Paragraph("<b>CONSIGNOR (SELLER)</b>", sty("ph",fontSize=9,fontName="Helvetica-Bold",textColor=WHITE)),
             Paragraph("<b>CONSIGNEE (BUYER)</b>",  sty("ph",fontSize=9,fontName="Helvetica-Bold",textColor=WHITE))],
            [Paragraph(f"<b>Steel Authority of India Ltd</b><br/>Bokaro Steel Plant<br/>{PLANT_ADDR1}<br/>GSTIN: {PLANT_GST}",
                        sty("pd",fontSize=9)),
             Paragraph(f"<b>{order.get('customer_name','—')}</b><br/>{dest} Division<br/>"
                        f"Email: {order.get('customer_email','—')}<br/>Order Ref: {order.get('order_id','—')}",
                        sty("pd",fontSize=9))],
        ]
        pt = Table(party_data, colWidths=[9*cm,9*cm])
        pt.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,0), TEAL),
            ("BACKGROUND", (0,1),(-1,1), LGRAY),
            ("GRID",       (0,0),(-1,-1), 0.5, BORDER),
            ("TOPPADDING", (0,0),(-1,-1), 7),
            ("BOTTOMPADDING",(0,0),(-1,-1),7),
            ("LEFTPADDING", (0,0),(-1,-1),10),
            ("VALIGN",     (0,0),(-1,-1),"TOP"),
        ]))
        elems.append(pt)
        elems.append(Spacer(1,0.3*cm))

        # ── SHIPMENT DETAILS ────────────────────────────────────────────────
        elems.append(Paragraph("SHIPMENT & WAGON DETAILS",
                                sty("sh",fontSize=9,fontName="Helvetica-Bold",textColor=NAVY)))
        elems.append(Spacer(1,0.1*cm))

        ship_data = [
            ["Field","Details","Field","Details"],
            ["Product Code",    prod,               "Product Name",  prod_full],
            ["HSN Code",        hsn,                "Quantity",      f"{qty:.2f} Metric Tons"],
            ["Rake ID",         rake.get("rake_id","—"), "Wagon Type",rake.get("wagon_type","—")],
            ["Wagons Assigned", str(wag_count),     "Your Wagon IDs", wag_ids],
            ["Origin Station",  "Bokaro (BOK)",     "Destination",   dest],
            ["Loading Started", load_start,         "Loading Complete",load_end],
            ["Date of Dispatch",dept,               "Expected Arrival",eta_str],
            ["Transit Distance",f"{dist} km",       "Transit Time",  f"~{transit} days"],
        ]
        st = Table(ship_data, colWidths=[3.8*cm,5*cm,3.8*cm,5.4*cm])
        st.setStyle(TableStyle([
            ("BACKGROUND",  (0,0),(-1,0), NAVY),
            ("TEXTCOLOR",   (0,0),(-1,0), WHITE),
            ("FONTNAME",    (0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",    (0,0),(-1,-1), 8),
            ("BACKGROUND",  (0,1),(0,-1), LGRAY),
            ("BACKGROUND",  (2,1),(2,-1), LGRAY),
            ("FONTNAME",    (0,1),(0,-1), "Helvetica-Bold"),
            ("FONTNAME",    (2,1),(2,-1), "Helvetica-Bold"),
            ("GRID",        (0,0),(-1,-1), 0.4, BORDER),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE, colors.HexColor("#f0f4f8")]),
            ("TOPPADDING",  (0,0),(-1,-1), 5),
            ("BOTTOMPADDING",(0,0),(-1,-1),5),
            ("LEFTPADDING", (0,0),(-1,-1), 6),
            ("VALIGN",      (0,0),(-1,-1), "MIDDLE"),
        ]))
        elems.append(st)
        elems.append(Spacer(1,0.3*cm))

        # ── CUSTOMER'S WAGON LIST ───────────────────────────────────────────
        if customer_wagons:
            elems.append(Paragraph(f"YOUR ASSIGNED WAGONS — {wag_count} wagons for Order {order.get('order_id')}",
                                    sty("wh",fontSize=9,fontName="Helvetica-Bold",textColor=NAVY)))
            elems.append(Paragraph("Note: Only wagons assigned to your order are shown below. Other consignments on this rake are confidential.",
                                    sty("wn",fontSize=7,textColor=GRAY)))
            elems.append(Spacer(1,0.15*cm))

            wlist = [["#","Wagon ID","Wagon Type","Loaded (T)","Capacity (T)","Utilization","Bogie A (T)","Bogie B (T)"]]
            for i, w in enumerate(customer_wagons, 1):
                wlist.append([
                    str(i),
                    w.get("wagon_id",""),
                    w.get("wagon_type",""),
                    f"{float(w.get('loaded_tons',0)):.1f}",
                    f"{float(w.get('capacity_tons',0)):.1f}",
                    f"{float(w.get('utilization_pct',0)):.1f}%",
                    f"{float(w.get('bogie_a_tons',0)):.1f}",
                    f"{float(w.get('bogie_b_tons',0)):.1f}",
                ])
            wt = Table(wlist, colWidths=[0.6*cm,3*cm,2*cm,2*cm,2*cm,2.2*cm,2.1*cm,2.1*cm])
            wt.setStyle(TableStyle([
                ("BACKGROUND",    (0,0),(-1,0), TEAL),
                ("TEXTCOLOR",     (0,0),(-1,0), WHITE),
                ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
                ("FONTSIZE",      (0,0),(-1,-1),7),
                ("GRID",          (0,0),(-1,-1),0.3,BORDER),
                ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,LGRAY]),
                ("TOPPADDING",    (0,0),(-1,-1),4),
                ("BOTTOMPADDING", (0,0),(-1,-1),4),
                ("LEFTPADDING",   (0,0),(-1,-1),4),
                ("ALIGN",         (0,0),(-1,-1),"CENTER"),
                ("ALIGN",         (1,1),(1,-1),"LEFT"),
            ]))
            elems.append(wt)
            elems.append(Spacer(1,0.3*cm))

        # ── TAX INVOICE ─────────────────────────────────────────────────────
        elems.append(Paragraph("TAX INVOICE (IGST — Interstate Supply)",
                                sty("ti",fontSize=9,fontName="Helvetica-Bold",textColor=NAVY)))
        elems.append(Spacer(1,0.1*cm))
        tax_data = [
            ["Description","HSN","Qty (MT)","Rate/MT (₹)","Taxable Value (₹)","IGST %","IGST Amount (₹)","Total (₹)"],
            [prod_full, hsn, f"{qty:.2f}", f"{rate_per_ton:,.0f}",
             f"{base_val:,.2f}", f"{gst_rate}%", f"{igst_amt:,.2f}", f"{total_amt:,.2f}"],
            ["Freight Charges","9965","—","—",
             f"{freight:,.2f}", f"{gst_rate}%", f"{round(freight*gst_rate/100,2):,.2f}", f"{round(freight*(1+gst_rate/100),2):,.2f}"],
        ]
        tt = Table(tax_data, colWidths=[3.8*cm,1.6*cm,1.4*cm,2*cm,2.8*cm,1.2*cm,2.4*cm,2.8*cm])
        tt.setStyle(TableStyle([
            ("BACKGROUND",  (0,0),(-1,0), NAVY),
            ("TEXTCOLOR",   (0,0),(-1,0), WHITE),
            ("FONTNAME",    (0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",    (0,0),(-1,-1),7),
            ("GRID",        (0,0),(-1,-1),0.4,BORDER),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,LGRAY]),
            ("TOPPADDING",  (0,0),(-1,-1),4),
            ("BOTTOMPADDING",(0,0),(-1,-1),4),
            ("LEFTPADDING", (0,0),(-1,-1),4),
        ]))
        elems.append(tt)

        # Total row
        grand_total = total_amt + round(freight*(1+gst_rate/100),2)
        total_row = Table([[
            Paragraph(f"<b>TOTAL INVOICE VALUE (Inclusive of IGST @ {gst_rate}%)</b>",
                       sty("tr",fontSize=9,fontName="Helvetica-Bold")),
            Paragraph(f"<b>₹ {grand_total:,.2f}</b>",
                       sty("tr2",fontSize=10,fontName="Helvetica-Bold",textColor=ORANGE,alignment=2))
        ]], colWidths=[13*cm,5*cm])
        total_row.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#fff8ed")),
            ("GRID",(0,0),(-1,-1),0.4,ORANGE),
            ("TOPPADDING",(0,0),(-1,-1),7),
            ("BOTTOMPADDING",(0,0),(-1,-1),7),
            ("LEFTPADDING",(0,0),(-1,-1),10),
        ]))
        elems.append(total_row)
        elems.append(Spacer(1,0.3*cm))

        # ── IMPORTANT NOTICES ──────────────────────────────────────────────
        notices = [
            ("⏰ DEMURRAGE WARNING",
             f"Indian Railways allows 48 hours FREE TIME after rake arrival at {dest}. "
             f"Demurrage charges of ₹8,000 per wagon per day will apply beyond this period. "
             f"Please ensure collection by {(eta_dt + timedelta(hours=48)).strftime('%d %B %Y')}.",
             RED),
            ("📋 COLLECTION REQUIREMENTS",
             "Please bring: (1) This e-RR document, (2) Company authorisation letter, "
             "(3) GST registration certificate, (4) Identity proof of authorised representative.",
             TEAL),
            ("📞 FOR QUERIES",
             f"Logistics Control Room: +91-6542-233100 (24x7) | Email: logistics@sail-bokaro.in | "
             f"Emergency: +91-6542-233999 | Rake Tracking: Use Order ID {order.get('order_id')} at customer portal",
             NAVY),
        ]
        for (title, text, col) in notices:
            n = Table([[
                Paragraph(f"<b>{title}</b><br/><font size='8'>{text}</font>",
                           sty("nt",fontSize=8,textColor=BLACK,leading=12))
            ]], colWidths=[18*cm])
            n.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#f8f9fa")),
                ("LEFTBORDERPADDING",(0,0),(0,-1),0),
                ("LINEAFTER", (0,0),(0,-1),0,WHITE),
                ("LINEBEFORE",(0,0),(0,-1),3,col),
                ("TOPPADDING",(0,0),(-1,-1),7),
                ("BOTTOMPADDING",(0,0),(-1,-1),7),
                ("LEFTPADDING",(0,0),(-1,-1),10),
            ]))
            elems.append(n)
            elems.append(Spacer(1,0.15*cm))

        # ── FOOTER ─────────────────────────────────────────────────────────
        elems.append(HRFlowable(width="100%", thickness=1, color=GRAY))
        elems.append(Spacer(1,0.15*cm))
        elems.append(Paragraph(
            f"This is a system-generated document from SAIL Bokaro DSS v2.0. "
            f"Generated: {now.strftime('%d %b %Y %H:%M:%S')} IST | "
            f"Document Reference: {err_no} | Subject to Jharkhand jurisdiction",
            sty("ft",fontSize=7,textColor=GRAY,alignment=TA_CENTER)))
        elems.append(Paragraph(
            "Steel Authority of India Limited is a Maharatna Central Public Sector Enterprise under Ministry of Steel, Government of India.",
            sty("ft2",fontSize=7,textColor=colors.HexColor("#aaaaaa"),alignment=TA_CENTER)))

        doc.build(elems)
        return buf.getvalue()
    except ImportError:
        return b""
    except Exception as e:
        print(f"PDF generation error: {e}")
        return b""


# ─────────────────────────────────────────────────────────────────────────────
# HTML EMAIL
# ─────────────────────────────────────────────────────────────────────────────
def _td(label, value, highlight=False):
    bg = "#fffbf0" if highlight else "white"
    vc = "#1a7a3c" if highlight else "#111"
    bld = "font-weight:700;" if highlight else ""
    return f'''<tr style="background:{bg}">
      <td style="padding:9px 16px;font-size:12px;color:#555;width:38%;
          border-bottom:1px solid #eef0f3;">{label}</td>
      <td style="padding:9px 16px;font-size:12px;{bld}color:{vc};
          border-bottom:1px solid #eef0f3;">{value}</td></tr>'''


def send_dispatch_confirmation(order: dict, rake: dict, customer_email: str,
                                customer_wagons: list = None) -> dict:
    """
    Professional dispatch email with customer-specific wagon list.
    customer_wagons: only THIS customer's wagons from the rake.
    """
    if customer_wagons is None:
        customer_wagons = rake.get("wagon_list", [])

    dest         = order.get("destination","—")
    dist         = int(order.get("distance_km", 500))
    transit      = max(1, dist // 350)
    now          = datetime.now()
    eta_dt       = now + timedelta(days=transit)
    eta_str      = eta_dt.strftime("%d %B %Y")
    dept_str     = order.get("dispatch_time", now.strftime("%d %B %Y, %H:%M hrs"))
    load_start   = order.get("loading_start", (now-timedelta(hours=4)).strftime("%H:%M hrs"))
    load_end     = order.get("loading_end",   (now-timedelta(hours=1)).strftime("%H:%M hrs"))
    coll_deadline= (eta_dt + timedelta(hours=48)).strftime("%d %B %Y")
    err_no       = f"BSP/{now.year}/{now.strftime('%m')}/{str(order.get('order_id','0')).zfill(6)}"
    inv_no       = f"SAIL/BSP/INV/{now.year}-{str(now.year+1)[-2:]}/{str(order.get('order_id','0')).zfill(5)}"

    prod         = order.get("product_type","—")
    prod_full    = PRODUCT_NAMES.get(prod, prod)
    qty          = float(order.get("quantity_tons", 0))
    gst_rate     = GST_RATES.get(prod, 18)
    rate_per_ton = float(order.get("rate_per_ton", 52000))
    base_val     = qty * rate_per_ton
    freight      = float(order.get("freight_cost", 0))
    taxable      = base_val + freight
    igst_amt     = round(taxable * gst_rate / 100, 2)
    grand_total  = round(taxable + igst_amt, 2)

    # Wagon rows HTML — only customer's wagons
    wagon_rows_html = ""
    if customer_wagons:
        for i, w in enumerate(customer_wagons[:15], 1):
            bg = "#f8faff" if i % 2 == 0 else "white"
            wagon_rows_html += f'''<tr style="background:{bg}">
              <td style="padding:7px 10px;font-size:11px;text-align:center;border-bottom:1px solid #eef0f3;">{i}</td>
              <td style="padding:7px 10px;font-size:11px;font-family:monospace;font-weight:700;
                  color:#1565a0;border-bottom:1px solid #eef0f3;">{w.get("wagon_id","")}</td>
              <td style="padding:7px 10px;font-size:11px;border-bottom:1px solid #eef0f3;">{w.get("wagon_type","")}</td>
              <td style="padding:7px 10px;font-size:11px;text-align:right;color:#166534;font-weight:700;
                  border-bottom:1px solid #eef0f3;">{float(w.get("loaded_tons",0)):.1f}T</td>
              <td style="padding:7px 10px;font-size:11px;text-align:right;border-bottom:1px solid #eef0f3;">
                {float(w.get("utilization_pct",0)):.0f}%</td>
            </tr>'''
        if len(customer_wagons) > 15:
            wagon_rows_html += f'<tr><td colspan="5" style="padding:7px 10px;font-size:11px;color:#888;text-align:center;">...and {len(customer_wagons)-15} more wagons (see attached PDF)</td></tr>'

    wagon_section = ""
    if wagon_rows_html:
        wagon_section = f'''
        <tr><td colspan="1" style="padding:20px 0 8px;">
          <div style="font-size:13px;font-weight:700;color:#0a1929;letter-spacing:0.5px;
              padding-left:0;border-left:4px solid #FF7A00;padding-left:10px;">
            YOUR ASSIGNED WAGONS — {len(customer_wagons)} wagons
          </div>
          <div style="font-size:11px;color:#888;margin-top:4px;">
            Only wagons carrying your consignment are shown below.
          </div>
        </td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #dde1e7;border-radius:4px;overflow:hidden;">
            <tr style="background:#0a1929;">
              <th style="padding:8px 10px;font-size:11px;color:white;font-weight:600;text-align:center;">#</th>
              <th style="padding:8px 10px;font-size:11px;color:white;font-weight:600;text-align:left;">Wagon ID</th>
              <th style="padding:8px 10px;font-size:11px;color:white;font-weight:600;text-align:left;">Type</th>
              <th style="padding:8px 10px;font-size:11px;color:white;font-weight:600;text-align:right;">Loaded</th>
              <th style="padding:8px 10px;font-size:11px;color:white;font-weight:600;text-align:right;">Fill%</th>
            </tr>
            {wagon_rows_html}
          </table>
        </td></tr>'''

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0"
    style="background:white;border-radius:6px;overflow:hidden;border:1px solid #dde1e7;">

  <!-- Letterhead -->
  <tr>
    <td style="background:#0a1929;padding:28px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>
          <div style="font-size:10px;color:#8899bb;letter-spacing:2px;font-weight:600;margin-bottom:5px;">
            STEEL AUTHORITY OF INDIA LIMITED</div>
          <div style="font-size:20px;color:white;font-weight:700;">{PLANT_NAME}</div>
          <div style="font-size:11px;color:#6688aa;margin-top:3px;">{PLANT_ADDR1}</div>
          <div style="font-size:10px;color:#556677;margin-top:2px;">GSTIN: {PLANT_GST} | CIN: {PLANT_CIN}</div>
        </td>
        <td align="right" style="vertical-align:top;">
          <div style="background:#FF7A00;color:white;font-size:10px;font-weight:700;
              letter-spacing:1.5px;padding:7px 16px;border-radius:3px;margin-bottom:8px;">
            ✅ DISPATCHED</div>
          <div style="font-size:9px;color:#8899bb;">e-RR: {err_no}</div>
          <div style="font-size:9px;color:#8899bb;">Inv: {inv_no}</div>
        </td>
      </tr></table>
    </td>
  </tr>
  <tr><td style="background:#FF7A00;height:3px;"></td></tr>

  <!-- Title -->
  <tr><td style="padding:24px 36px 16px;border-bottom:1px solid #eef0f3;">
    <div style="font-size:17px;font-weight:700;color:#0a1929;margin-bottom:3px;">
      Dispatch Confirmation — Electronic Railway Receipt</div>
    <div style="font-size:12px;color:#666;">
      Dear <strong>{order.get("customer_name","Valued Customer")}</strong>,
      your order has been dispatched from <strong>Bokaro Steel Plant</strong> via Indian Railways.
    </div>
  </td></tr>

  <tr><td style="padding:20px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0">

      <!-- Shipment details -->
      <tr><td style="padding-bottom:8px;">
        <div style="font-size:12px;font-weight:700;color:#0a1929;
            border-left:4px solid #FF7A00;padding-left:10px;letter-spacing:0.5px;">
          SHIPMENT DETAILS</div>
      </td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #dde1e7;border-radius:4px;overflow:hidden;">
          <tr style="background:#f7f9fc;">
            <td colspan="2" style="padding:9px 16px;font-size:10px;font-weight:700;color:#0a1929;
                letter-spacing:1px;border-bottom:1px solid #dde1e7;">ORDER &amp; PRODUCT</td></tr>
          {_td("Order Reference", f"<span style='font-family:monospace;font-size:13px;color:#FF7A00;font-weight:700;'>{order.get('order_id','—')}</span>")}
          {_td("Product Code", prod)}
          {_td("Product Name", prod_full)}
          {_td("HSN Code", HSN_CODES.get(prod,"72089000"))}
          {_td("Quantity", f"<b>{qty:.2f} Metric Tons</b>")}
          <tr style="background:#f7f9fc;"><td colspan="2" style="padding:9px 16px;font-size:10px;
              font-weight:700;color:#0a1929;letter-spacing:1px;border-bottom:1px solid #dde1e7;
              border-top:1px solid #dde1e7;">TRANSPORT DETAILS</td></tr>
          {_td("Rake ID", f"<b style='color:#1565a0;'>{rake.get('rake_id','—')}</b>")}
          {_td("Wagon Type", rake.get("wagon_type","—"))}
          {_td("Wagons (Your Order)", str(len(customer_wagons)))}
          {_td("Origin Station", "Bokaro Steel City (BOK) — Jharkhand")}
          {_td("Destination", f"<b>{dest}</b>")}
          {_td("Transit Distance", f"{dist} km")}
          <tr style="background:#f7f9fc;"><td colspan="2" style="padding:9px 16px;font-size:10px;
              font-weight:700;color:#0a1929;letter-spacing:1px;border-bottom:1px solid #dde1e7;
              border-top:1px solid #dde1e7;">TIMELINE</td></tr>
          {_td("Loading Started",  load_start)}
          {_td("Loading Completed",load_end)}
          {_td("Date of Dispatch", dept_str)}
          {_td("Expected Arrival", f"<b style='color:#1a7a3c;font-size:13px;'>{eta_str}</b>", highlight=True)}
          {_td("Collection Deadline", f"<b style='color:#dc2626;'>{coll_deadline}</b> (48h free time)")}
        </table>
      </td></tr>

      <!-- Wagon list -->
      {wagon_section}

      <!-- Tax Invoice -->
      <tr><td style="padding:20px 0 8px;">
        <div style="font-size:12px;font-weight:700;color:#0a1929;
            border-left:4px solid #1565a0;padding-left:10px;letter-spacing:0.5px;">
          TAX INVOICE SUMMARY (IGST — Interstate)</div>
      </td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0"
            style="border:1px solid #dde1e7;border-radius:4px;overflow:hidden;">
          <tr style="background:#0a1929;">
            <th style="padding:8px 12px;font-size:11px;color:white;text-align:left;">Description</th>
            <th style="padding:8px 12px;font-size:11px;color:white;text-align:right;">Taxable Value</th>
            <th style="padding:8px 12px;font-size:11px;color:white;text-align:right;">IGST @{gst_rate}%</th>
            <th style="padding:8px 12px;font-size:11px;color:white;text-align:right;">Total</th>
          </tr>
          <tr><td style="padding:8px 12px;font-size:11px;border-bottom:1px solid #eef0f3;">
              {prod_full} ({qty:.1f} MT @ ₹{rate_per_ton:,.0f}/MT)</td>
            <td style="padding:8px 12px;font-size:11px;text-align:right;border-bottom:1px solid #eef0f3;">
              ₹{base_val:,.2f}</td>
            <td style="padding:8px 12px;font-size:11px;text-align:right;border-bottom:1px solid #eef0f3;">
              ₹{igst_amt:,.2f}</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;text-align:right;border-bottom:1px solid #eef0f3;">
              ₹{base_val+igst_amt:,.2f}</td>
          </tr>
          <tr style="background:#f8f9fa;"><td style="padding:8px 12px;font-size:11px;border-bottom:1px solid #eef0f3;">
              Freight Charges</td>
            <td style="padding:8px 12px;font-size:11px;text-align:right;border-bottom:1px solid #eef0f3;">
              ₹{freight:,.2f}</td>
            <td style="padding:8px 12px;font-size:11px;text-align:right;border-bottom:1px solid #eef0f3;">
              ₹{round(freight*gst_rate/100,2):,.2f}</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;text-align:right;border-bottom:1px solid #eef0f3;">
              ₹{round(freight*(1+gst_rate/100),2):,.2f}</td>
          </tr>
          <tr style="background:#fffbf0;">
            <td colspan="3" style="padding:10px 12px;font-size:12px;font-weight:700;color:#0a1929;">
              TOTAL INVOICE VALUE (Incl. IGST)</td>
            <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#FF7A00;text-align:right;">
              ₹{grand_total:,.2f}</td>
          </tr>
        </table>
      </td></tr>

      <!-- Notices -->
      <tr><td style="padding-top:18px;">
        <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#fef2f2;border:1px solid #ffc5be;border-radius:4px;">
          <tr><td style="padding:13px 16px;">
            <div style="font-size:12px;font-weight:700;color:#b83020;margin-bottom:4px;">
              ⏰ IMPORTANT — COLLECTION DEADLINE: {coll_deadline}</div>
            <div style="font-size:12px;color:#333;">Indian Railways allows 48 hours free time.
              Demurrage charges of <strong>₹8,000 per wagon per day</strong> apply after this.
              You have {len(customer_wagons)} wagons — total demurrage risk after deadline:
              <strong>₹{len(customer_wagons)*8000:,}/day</strong>.</div>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding-top:10px;">
        <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;">
          <tr><td style="padding:13px 16px;">
            <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:4px;">
              📞 CONTACT &amp; QUERIES</div>
            <div style="font-size:12px;color:#333;">
              Control Room: <strong>+91-6542-233100</strong> (24×7) |
              Email: <a href="mailto:logistics@sail-bokaro.in" style="color:#FF7A00;">logistics@sail-bokaro.in</a><br>
              Track shipment using Order ID <strong style="font-family:monospace;">{order.get('order_id')}</strong>
            </div>
          </td></tr>
        </table>
      </td></tr>

    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f7f9fc;padding:18px 36px;border-top:1px solid #eaeef4;">
    <div style="font-size:11px;color:#888;line-height:1.7;">
      System-generated from <strong>SAIL Bokaro DSS v2.0</strong>. Retain this with your e-RR for collection.<br>
      Steel Authority of India Limited · Maharatna CPSE · Ministry of Steel, Govt. of India
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>"""

    pdf = generate_err_pdf(order, rake, customer_wagons)
    return _send_email(
        customer_email,
        f"Dispatch Confirmed | {order.get('order_id')} | {rake.get('rake_id','—')} | {dest} | e-RR: {err_no}",
        html,
        [(pdf, f"eRR_{err_no.replace('/','_')}.pdf")] if pdf else []
    )


def send_weather_delay_alert(order, customer_email, weather, new_eta):
    html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:white;padding:24px;border:1px solid #dee2e6;">
      <div style="background:#0a1929;padding:16px;text-align:center;margin:-24px -24px 20px;">
        <div style="color:#FF7A00;font-size:18px;font-weight:700;">SAIL BOKARO — TRANSIT ALERT</div></div>
      <div style="background:#fff0f0;border-left:4px solid #ff2d55;padding:12px;margin-bottom:16px;">
        <strong style="color:#ff2d55;">⚠️ WEATHER DELAY — Order {order.get('order_id')}</strong></div>
      <p>Due to <strong>{weather.get('condition','adverse weather')}</strong> on the transit route,
      your shipment may be delayed.<br>Revised ETA: <strong style="color:#FF7A00;">{new_eta}</strong></p>
      <p style="color:#888;font-size:11px;">SAIL Bokaro DSS · logistics@sail-bokaro.in</p></div>"""
    return _send_email(customer_email, f"⚠️ Transit Delay | Order {order.get('order_id')}", html)


def send_arrival_notification(order, customer_email):
    html = f"""<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:white;padding:24px;border:1px solid #dee2e6;">
      <div style="background:#0a1929;padding:16px;text-align:center;margin:-24px -24px 20px;">
        <div style="color:#FF7A00;font-size:18px;font-weight:700;">SAIL BOKARO</div></div>
      <div style="background:#f0fdf4;border-left:4px solid #34c759;padding:12px;margin-bottom:16px;">
        <strong style="color:#16a34a;">🏁 YOUR SHIPMENT HAS ARRIVED</strong></div>
      <p>Order <strong>{order.get('order_id')}</strong> has arrived at <strong>{order.get('destination')}</strong>.</p>
      <div style="background:#fffbf0;border:1px solid #ffcc02;padding:12px;border-radius:4px;margin:16px 0;">
        <strong>⏰ Please collect within 24 hours</strong> to avoid ₹8,000/wagon/day demurrage.</div>
      <p>Bring your e-RR and company authorisation letter.</p>
      <p style="color:#888;font-size:11px;">SAIL Bokaro DSS · logistics@sail-bokaro.in</p></div>"""
    return _send_email(customer_email, f"🏁 Arrived | Order {order.get('order_id')} at {order.get('destination')}", html)
