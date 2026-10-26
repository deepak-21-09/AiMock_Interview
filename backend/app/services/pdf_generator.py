"""
High-fidelity, professionally styled PDF Report Generator for Adaptive AI Mock Interview.
Renders an interview report that closely matches the official reference design:
- Crisp vector icons (Robot, Calendar, Person, Analytics, Star, Warning, Bulb, Chat, Target)
- Modern cards with rounded corners, subtle colored borders, and clean typography
- Circular gauge for overall score, horizontal progress bars, and rubric breakdown table
- Clean status pill badge, checkmarked strengths, bulleted issues, and improvement areas
- Actionable recommendation strip and multi-page capable pagination
"""

import os
import math
from typing import Dict, Any, List
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas that accurately calculates and prints total page counts in footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_footer(num_pages)
            super().showPage()
        super().save()

    def draw_page_footer(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(28.0, 18.0, "Adaptive AI Mock Interview  |  Interview Report")
        self.drawRightString(612.0 - 28.0, 18.0, f"Page {self._pageNumber} of {total_pages}")
        self.restoreState()


class StyledPDFReportGenerator:
    """Generates an executive, polished PDF interview report matching the reference design."""

    def __init__(self):
        self.page_width, self.page_height = letter  # 612 x 792 pt
        self.margin_x = 28.0
        self.content_width = self.page_width - (2 * self.margin_x)  # 556 pt

        # Brand palette matching reference screenshot
        self.c_navy = colors.HexColor("#0F172A")
        self.c_slate = colors.HexColor("#64748B")
        self.c_blue = colors.HexColor("#2563EB")
        self.c_blue_light = colors.HexColor("#F8FAFC")
        self.c_blue_border = colors.HexColor("#BFDBFE")
        self.c_blue_banner = colors.HexColor("#EFF6FF")
        self.c_blue_text = colors.HexColor("#1D4ED8")

        # Strengths (Green)
        self.c_green_bg = colors.HexColor("#F0FDF4")
        self.c_green_border = colors.HexColor("#BBF7D0")
        self.c_green_title = colors.HexColor("#15803D")
        self.c_green_icon = colors.HexColor("#16A34A")

        # Issues (Red)
        self.c_red_bg = colors.HexColor("#FEF2F2")
        self.c_red_border = colors.HexColor("#FECACA")
        self.c_red_title = colors.HexColor("#991B1B")
        self.c_red_icon = colors.HexColor("#DC2626")

        # Improvements (Yellow/Amber)
        self.c_amber_bg = colors.HexColor("#FFFBEB")
        self.c_amber_border = colors.HexColor("#FDE68A")
        self.c_amber_title = colors.HexColor("#92400E")
        self.c_amber_icon = colors.HexColor("#D97706")

        # Progress bar colors
        self.c_bar_purple = colors.HexColor("#8B5CF6")
        self.c_bar_teal = colors.HexColor("#0D9488")
        self.c_track_bg = colors.HexColor("#E2E8F0")

    # ---------------------------------------------------------
    # VECTOR ICONS
    # ---------------------------------------------------------
    def _draw_robot_logo(self, c: canvas.Canvas, x: float, y: float, size: float = 34.0):
        """Draws the blue robot avatar icon matching the header."""
        cx = x + size / 2.0
        cy = y + size / 2.0 - 1.0

        # Antenna
        c.setStrokeColor(self.c_blue)
        c.setLineWidth(1.4)
        c.line(cx, cy + 10.0, cx, cy + 13.5)
        c.setFillColor(self.c_blue)
        c.circle(cx, cy + 14.5, 1.8, fill=1, stroke=0)

        # Ears / side pods
        c.setFillColor(self.c_blue)
        c.roundRect(cx - 15.5, cy - 2.5, 3.2, 7.0, 1.5, fill=1, stroke=0)
        c.roundRect(cx + 12.3, cy - 2.5, 3.2, 7.0, 1.5, fill=1, stroke=0)

        # Outer head
        c.roundRect(cx - 12.5, cy - 11.5, 25.0, 22.0, 5.5, fill=1, stroke=0)

        # Face screen
        c.setFillColor(colors.white)
        c.roundRect(cx - 10.0, cy - 9.0, 20.0, 17.0, 4.0, fill=1, stroke=0)

        # Eyes
        c.setFillColor(self.c_blue)
        c.circle(cx - 4.5, cy + 0.5, 1.9, fill=1, stroke=0)
        c.circle(cx + 4.5, cy + 0.5, 1.9, fill=1, stroke=0)

        # Smile
        c.setStrokeColor(self.c_blue)
        c.setLineWidth(1.4)
        c.line(cx - 4.0, cy - 4.2, cx + 4.0, cy - 4.2)

    def _draw_download_button(self, c: canvas.Canvas, x: float, y: float, w: float = 164.0, h: float = 27.0):
        """Draws the prominent blue Download Report as PDF button visual."""
        c.setFillColor(self.c_blue)
        c.roundRect(x, y, w, h, 4.5, fill=1, stroke=0)

        # Download icon (tray + arrow)
        c.setStrokeColor(colors.white)
        c.setLineWidth(1.3)
        icon_x = x + 14.0
        icon_y = y + 7.5

        # Tray
        c.line(icon_x, icon_y + 8.0, icon_x, icon_y + 2.0)
        c.line(icon_x, icon_y + 2.0, icon_x + 11.0, icon_y + 2.0)
        c.line(icon_x + 11.0, icon_y + 2.0, icon_x + 11.0, icon_y + 8.0)

        # Arrow down
        arrow_cx = icon_x + 5.5
        c.line(arrow_cx, icon_y + 11.5, arrow_cx, icon_y + 4.5)
        c.line(arrow_cx - 3.0, icon_y + 7.5, arrow_cx, icon_y + 4.5)
        c.line(arrow_cx + 3.0, icon_y + 7.5, arrow_cx, icon_y + 4.5)

        # Text
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9.0)
        c.drawString(x + 32.0, y + 8.5, "Download Report as PDF")

    def _draw_person_icon(self, c: canvas.Canvas, x: float, y: float):
        c.setFillColor(self.c_blue)
        c.circle(x + 6.0, y + 9.5, 3.2, fill=1, stroke=0)
        c.setStrokeColor(self.c_blue)
        c.setLineWidth(1.5)
        p = c.beginPath()
        p.arc(x + 0.5, y - 2.5, x + 11.5, y + 7.5, 20, 140)
        c.drawPath(p, fill=0, stroke=1)

    def _draw_calendar_icon(self, c: canvas.Canvas, x: float, y: float):
        c.setStrokeColor(self.c_blue)
        c.setLineWidth(1.3)
        c.setFillColor(self.c_blue_banner)
        c.roundRect(x + 0.5, y + 0.5, 11.0, 11.0, 2.0, fill=1, stroke=1)
        c.setLineWidth(1.4)
        c.line(x + 3.0, y + 10.0, x + 3.0, y + 13.0)
        c.line(x + 9.0, y + 10.0, x + 9.0, y + 13.0)
        c.setLineWidth(1.0)
        c.line(x + 0.5, y + 8.0, x + 11.5, y + 8.0)

    def _draw_chart_icon(self, c: canvas.Canvas, x: float, y: float):
        c.setStrokeColor(self.c_blue)
        c.setLineWidth(1.2)
        c.line(x + 0.5, y + 12.0, x + 0.5, y + 0.5)
        c.line(x + 0.5, y + 0.5, x + 12.5, y + 0.5)
        c.setFillColor(self.c_blue)
        c.rect(x + 2.5, y + 1.0, 2.2, 4.0, fill=1, stroke=0)
        c.rect(x + 5.8, y + 1.0, 2.2, 7.5, fill=1, stroke=0)
        c.rect(x + 9.2, y + 1.0, 2.2, 10.5, fill=1, stroke=0)

    def _draw_star_icon(self, c: canvas.Canvas, x: float, y: float, size: float = 12.0):
        c.setFillColor(self.c_green_icon)
        cx = x + size / 2.0
        cy = y + size / 2.0
        r_out = size / 2.0
        r_in = r_out * 0.42
        p = c.beginPath()
        for i in range(10):
            ang = math.radians(90 + i * 36)
            r = r_out if i % 2 == 0 else r_in
            px = cx + r * math.cos(ang)
            py = cy + r * math.sin(ang)
            if i == 0:
                p.moveTo(px, py)
            else:
                p.lineTo(px, py)
        p.close()
        c.drawPath(p, fill=1, stroke=0)

    def _draw_warning_icon(self, c: canvas.Canvas, x: float, y: float, size: float = 12.0):
        c.setFillColor(self.c_red_icon)
        cx = x + size / 2.0
        p = c.beginPath()
        p.moveTo(cx, y + size)
        p.lineTo(x, y + 0.5)
        p.lineTo(x + size, y + 0.5)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
        c.setStrokeColor(colors.white)
        c.setLineWidth(1.2)
        c.line(cx, y + size - 4.0, cx, y + 4.5)
        c.setFillColor(colors.white)
        c.circle(cx, y + 2.3, 0.75, fill=1, stroke=0)

    def _draw_bulb_icon(self, c: canvas.Canvas, x: float, y: float, size: float = 12.0):
        cx = x + size / 2.0
        cy = y + size / 2.0 + 1.5
        c.setFillColor(self.c_amber_icon)
        c.circle(cx, cy, 4.0, fill=1, stroke=0)
        c.roundRect(cx - 2.5, y + 1.0, 5.0, 3.5, 0.8, fill=1, stroke=0)

    def _draw_chat_icon(self, c: canvas.Canvas, x: float, y: float, size: float = 12.0):
        c.setStrokeColor(self.c_blue)
        c.setLineWidth(1.3)
        c.setFillColor(self.c_blue_banner)
        c.roundRect(x + 0.5, y + 2.5, 11.5, 9.0, 2.5, fill=1, stroke=1)
        p = c.beginPath()
        p.moveTo(x + 2.5, y + 2.5)
        p.lineTo(x + 1.0, y - 0.5)
        p.lineTo(x + 5.5, y + 2.5)
        c.drawPath(p, fill=1, stroke=1)

    def _draw_target_icon(self, c: canvas.Canvas, x: float, y: float, size: float = 12.0):
        cx = x + size / 2.0
        cy = y + size / 2.0
        c.setStrokeColor(self.c_blue)
        c.setLineWidth(1.3)
        c.circle(cx, cy, 5.5, fill=0, stroke=1)
        c.setLineWidth(1.0)
        c.circle(cx, cy, 3.0, fill=0, stroke=1)
        c.setFillColor(self.c_blue)
        c.circle(cx, cy, 1.2, fill=1, stroke=0)

    def _draw_checkmark(self, c: canvas.Canvas, x: float, y: float):
        c.setStrokeColor(self.c_green_icon)
        c.setLineWidth(1.5)
        c.line(x, y + 3.0, x + 3.0, y)
        c.line(x + 3.0, y, x + 8.5, y + 7.0)

    def _draw_shield_icon(self, c: canvas.Canvas, x: float, y: float, size: float = 12.0):
        c.setStrokeColor(self.c_blue)
        c.setFillColor(self.c_blue_banner)
        c.setLineWidth(1.2)
        cx = x + size / 2.0
        p = c.beginPath()
        p.moveTo(cx, y + size)
        p.lineTo(x + size - 1.0, y + size - 3.0)
        p.lineTo(x + size - 2.0, y + 4.0)
        p.lineTo(cx, y)
        p.lineTo(x + 2.0, y + 4.0)
        p.lineTo(x + 1.0, y + size - 3.0)
        p.close()
        c.drawPath(p, fill=1, stroke=1)

    # ---------------------------------------------------------
    # SCORE GAUGE & BARS
    # ---------------------------------------------------------
    def _draw_circular_gauge(self, c: canvas.Canvas, cx: float, cy: float, radius: float, score: float):
        """Draws the overall score gauge matching the screenshot."""
        stroke_w = 6.0
        c.setStrokeColor(self.c_track_bg)
        c.setLineWidth(stroke_w)
        c.circle(cx, cy, radius, stroke=1, fill=0)

        pct = max(0.0, min(100.0, float(score)))
        angle_extent = -(pct / 100.0) * 360.0
        c.setStrokeColor(colors.HexColor("#10B981"))
        c.setLineWidth(stroke_w)
        c.arc(cx - radius, cy - radius, cx + radius, cy + radius, 90, angle_extent)

        score_int = int(round(score))
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 14.0)
        c.drawCentredString(cx - 10.0, cy - 4.5, str(score_int))
        c.setFont("Helvetica-Bold", 10.0)
        c.setFillColor(colors.HexColor("#334155"))
        c.drawString(cx + 3.0, cy - 4.5, "/ 100")

        c.setFont("Helvetica-Bold", 9.0)
        c.setFillColor(self.c_navy)
        c.drawCentredString(cx, cy - radius - 15.0, "Overall Score")

    def _draw_horizontal_bar(
        self,
        c: canvas.Canvas,
        x: float,
        y: float,
        width: float,
        height: float,
        score: float,
        bar_color: colors.HexColor
    ):
        """Draws a rounded horizontal progress bar with its score beside it."""
        c.setFillColor(self.c_track_bg)
        c.roundRect(x, y, width, height, height / 2.0, fill=1, stroke=0)

        pct = max(0.0, min(100.0, float(score)))
        fill_w = max(height, width * (pct / 100.0))
        c.setFillColor(bar_color)
        c.roundRect(x, y, fill_w, height, height / 2.0, fill=1, stroke=0)

    # ---------------------------------------------------------
    # TEXT HELPER
    # ---------------------------------------------------------
    def _wrap_text(self, text: str, max_chars: int = 118) -> List[str]:
        words = text.split()
        lines = []
        curr = []
        curr_len = 0
        for w in words:
            if curr_len + len(w) + 1 > max_chars:
                lines.append(" ".join(curr))
                curr = [w]
                curr_len = len(w)
            else:
                curr.append(w)
                curr_len += len(w) + 1
        if curr:
            lines.append(" ".join(curr))
        return lines

    def _check_page_break(self, c: canvas.Canvas, curr_y: float, needed_h: float, display_id: str) -> float:
        """Starts a new page if the upcoming card exceeds the page boundary."""
        if curr_y - needed_h < 40.0:
            c.showPage()
            # New page header banner
            top_y = 752.0
            self._draw_robot_logo(c, self.margin_x, top_y - 2.0, 28.0)
            c.setFillColor(self.c_navy)
            c.setFont("Helvetica-Bold", 14.0)
            c.drawString(self.margin_x + 36.0, top_y + 10.0, "Adaptive AI Mock Interview")
            c.setFillColor(self.c_slate)
            c.setFont("Helvetica", 9.5)
            c.drawString(self.margin_x + 36.0, top_y - 2.0, "Interview Report (Continued)")
            c.setFont("Helvetica", 8.0)
            c.drawRightString(self.margin_x + self.content_width, top_y - 2.0, f"Interview ID: {display_id}")
            return top_y - 28.0
        return curr_y

    # ---------------------------------------------------------
    # MAIN REPORT RENDERER
    # ---------------------------------------------------------
    def generate(self, session_id: str, report_data: Dict[str, Any], output_path: str) -> str:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        c = NumberedCanvas(output_path, pagesize=letter)

        # 1. Normalize Dynamic Data
        candidate_name = report_data.get("candidate_name") or "Candidate"
        target_role = report_data.get("target_role") or "Software Engineer"

        display_id = report_data.get("session_id_display")
        if not display_id:
            short_id = session_id[:8].upper() if len(session_id) >= 8 else session_id.upper()
            display_id = f"INT-{short_id}"

        interview_date = report_data.get("interview_date") or "Apr 26, 2025"
        interview_time = report_data.get("interview_time") or "(10:30 AM)"
        duration = report_data.get("duration") or "15 minutes"
        status = report_data.get("status") or "Completed"
        questions_answered = report_data.get("questions_answered") or "5 / 5"

        # Scores
        raw_overall = float(report_data.get("overall_score", 75.0))
        overall_score = round(raw_overall, 1)

        # Dimension scores
        tech_avg = float(report_data.get("technical_avg", 3.8))
        comm_avg = float(report_data.get("communication_avg", 3.6))
        prob_avg = float(report_data.get("problem_solving_avg", 3.4))
        rel_avg = float(report_data.get("relevance_avg", 3.5))

        tech_score = round(report_data.get("tech_score_100", (tech_avg / 5.0) * 100))
        comm_score = round(report_data.get("comm_score_100", (comm_avg / 5.0) * 100))
        behav_score = round(report_data.get("behav_score_100", (((prob_avg + rel_avg) / 2.0) / 5.0) * 100))

        # Strengths
        raw_strengths = report_data.get("strengths") or []
        if not raw_strengths:
            strengths = [
                "Strong problem-solving skills and logical thinking.",
                "Clear and confident communication throughout the interview.",
                "Good understanding of core technical concepts.",
                "Maintained a positive and professional attitude."
            ]
        else:
            strengths = raw_strengths[:4]

        # Issues
        raw_issues = report_data.get("issues") or []
        if not raw_issues:
            issues = [
                "No significant interview issues were recorded."
            ]
        else:
            issues = raw_issues[:3]

        # Improvements
        raw_weaknesses = report_data.get("weaknesses") or []
        raw_exercises = report_data.get("practice_exercises") or []
        improvements = []
        for w in raw_weaknesses:
            if len(improvements) < 4:
                improvements.append(w)
        for ex in raw_exercises:
            if len(improvements) < 4:
                improvements.append(ex)
        if not improvements:
            improvements = [
                "Practice time management to ensure all questions are attempted.",
                "Provide more detailed and structured answers, especially for technical questions.",
                "Work on communication clarity and avoid filler words.",
                "Ensure a stable internet connection to avoid technical disruptions."
            ]

        # Final Feedback & Recommendation
        final_feedback = report_data.get("final_feedback") or report_data.get("summary")
        if not final_feedback or len(final_feedback.strip()) < 20:
            final_feedback = (
                f"{candidate_name} demonstrated good technical knowledge and communication skills for the {target_role} role. "
                f"With some improvements in structured problem-solving and deeper technical trade-off articulation, you can "
                f"perform even better in upcoming interviews. We recommend regular mock practice focusing on the areas outlined above."
            )

        recommendation = report_data.get("recommendation")
        if not recommendation:
            if overall_score >= 80:
                recommendation = "Ready for advanced technical interview rounds with high confidence."
            elif overall_score >= 65:
                recommendation = "Ready for the next level with focused practice."
            else:
                recommendation = "Continue practicing core fundamentals before the next interview round."

        # -----------------------------------------------------
        # LAYOUT POSITIONS & DIMENSIONS
        # -----------------------------------------------------
        card_w = self.content_width
        start_x = self.margin_x

        # Top Header
        top_y = 752.0
        self._draw_robot_logo(c, start_x, top_y - 2.0, 34.0)

        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 17.5)
        c.drawString(start_x + 42.0, top_y + 14.0, "Adaptive AI Mock Interview")

        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 11.0)
        c.drawString(start_x + 42.0, top_y - 1.0, "Interview Report")

        # Download button visual
        btn_w = 164.0
        btn_h = 27.0
        btn_x = start_x + card_w - btn_w
        self._draw_download_button(c, btn_x, top_y + 3.0, btn_w, btn_h)

        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 8.0)
        c.drawRightString(start_x + card_w, top_y - 9.0, f"Interview ID: {display_id}")

        curr_y = top_y - 25.0

        # -----------------------------------------------------
        # 1. Candidate Details Card
        # -----------------------------------------------------
        c1_h = 52.0
        curr_y = self._check_page_break(c, curr_y, c1_h, display_id)
        curr_y -= c1_h
        c.setFillColor(self.c_blue_light)
        c.setStrokeColor(self.c_blue_border)
        c.setLineWidth(0.75)
        c.roundRect(start_x, curr_y, card_w, c1_h, 6.0, fill=1, stroke=1)

        self._draw_person_icon(c, start_x + 12.0, curr_y + c1_h - 18.0)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(start_x + 28.0, curr_y + c1_h - 15.0, "1. Candidate Details")

        col1_x = start_x + 14.0
        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 7.5)
        c.drawString(col1_x, curr_y + 22.0, "Name")
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(col1_x, curr_y + 9.0, candidate_name[:26])

        c.setStrokeColor(self.c_track_bg)
        c.setLineWidth(0.75)
        div1_x = start_x + 185.0
        c.line(div1_x, curr_y + 6.0, div1_x, curr_y + 30.0)

        col2_x = div1_x + 14.0
        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 7.5)
        c.drawString(col2_x, curr_y + 22.0, "Target Track")
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(col2_x, curr_y + 9.0, target_role[:28])

        div2_x = start_x + 380.0
        c.line(div2_x, curr_y + 6.0, div2_x, curr_y + 30.0)

        col3_x = div2_x + 14.0
        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 7.5)
        c.drawString(col3_x, curr_y + 22.0, "Session ID")
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 9.0)
        c.drawString(col3_x, curr_y + 9.0, display_id[:24])

        curr_y -= 9.0

        # -----------------------------------------------------
        # 2. Interview Summary Card
        # -----------------------------------------------------
        c2_h = 56.0
        curr_y = self._check_page_break(c, curr_y, c2_h, display_id)
        curr_y -= c2_h
        c.setFillColor(self.c_blue_light)
        c.setStrokeColor(self.c_blue_border)
        c.setLineWidth(0.75)
        c.roundRect(start_x, curr_y, card_w, c2_h, 6.0, fill=1, stroke=1)

        self._draw_calendar_icon(c, start_x + 12.0, curr_y + c2_h - 18.0)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(start_x + 28.0, curr_y + c2_h - 15.0, "2. Interview Summary")

        s_col1 = start_x + 14.0
        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 7.5)
        c.drawString(s_col1, curr_y + 24.0, "Interview Date")
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 9.0)
        c.drawString(s_col1, curr_y + 13.0, interview_date)
        c.setFont("Helvetica", 7.5)
        c.drawString(s_col1, curr_y + 3.0, interview_time)

        s_div1 = start_x + 138.0
        c.setStrokeColor(self.c_track_bg)
        c.setLineWidth(0.75)
        c.line(s_div1, curr_y + 6.0, s_div1, curr_y + 32.0)

        s_col2 = s_div1 + 14.0
        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 7.5)
        c.drawString(s_col2, curr_y + 24.0, "Duration")
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 9.0)
        c.drawString(s_col2, curr_y + 11.0, duration)

        s_div2 = start_x + 276.0
        c.line(s_div2, curr_y + 6.0, s_div2, curr_y + 32.0)

        s_col3 = s_div2 + 14.0
        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 7.5)
        c.drawString(s_col3, curr_y + 24.0, "Status")
        pill_w = 66.0
        pill_h = 16.0
        pill_y = curr_y + 8.0
        c.setFillColor(colors.HexColor("#DCFCE7"))
        c.setStrokeColor(colors.HexColor("#86EFAC"))
        c.setLineWidth(0.75)
        c.roundRect(s_col3, pill_y, pill_w, pill_h, pill_h / 2.0, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#15803D"))
        c.setFont("Helvetica-Bold", 7.5)
        status_label = f"✓ {status.capitalize()}" if "completed" in status.lower() else status.capitalize()
        c.drawCentredString(s_col3 + pill_w / 2.0, pill_y + 4.5, status_label)

        s_div3 = start_x + 414.0
        c.setStrokeColor(self.c_track_bg)
        c.setLineWidth(0.75)
        c.line(s_div3, curr_y + 6.0, s_div3, curr_y + 32.0)

        s_col4 = s_div3 + 14.0
        c.setFillColor(self.c_slate)
        c.setFont("Helvetica", 7.5)
        c.drawString(s_col4, curr_y + 24.0, "Questions Answered")
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(s_col4, curr_y + 11.0, questions_answered)

        curr_y -= 9.0

        # -----------------------------------------------------
        # 3. Marks & Performance Overview Card
        # -----------------------------------------------------
        c3_h = 118.0
        curr_y = self._check_page_break(c, curr_y, c3_h, display_id)
        curr_y -= c3_h
        c.setFillColor(self.c_blue_light)
        c.setStrokeColor(self.c_blue_border)
        c.setLineWidth(0.75)
        c.roundRect(start_x, curr_y, card_w, c3_h, 6.0, fill=1, stroke=1)

        self._draw_chart_icon(c, start_x + 12.0, curr_y + c3_h - 18.0)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(start_x + 28.0, curr_y + c3_h - 15.0, "3. Marks & Performance Overview")

        # Column A: Overall Score Gauge
        gauge_cx = start_x + 72.0
        gauge_cy = curr_y + 57.0
        self._draw_circular_gauge(c, gauge_cx, gauge_cy, 28.0, overall_score)

        # Column B: Performance Breakdown
        pb_x = start_x + 142.0
        pb_w = 155.0
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 9.0)
        c.drawString(pb_x, curr_y + c3_h - 26.0, "Performance Breakdown")

        c.setFillColor(self.c_navy)
        c.setFont("Helvetica", 7.5)
        c.drawString(pb_x, curr_y + 63.0, "Technical Performance")
        self._draw_horizontal_bar(c, pb_x, curr_y + 53.0, pb_w, 5.0, tech_score, self.c_blue)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(pb_x + pb_w + 6.0, curr_y + 52.0, f"{tech_score} / 100")

        c.setFillColor(self.c_navy)
        c.setFont("Helvetica", 7.5)
        c.drawString(pb_x, curr_y + 40.0, "Communication Performance")
        self._draw_horizontal_bar(c, pb_x, curr_y + 30.0, pb_w, 5.0, comm_score, self.c_bar_purple)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(pb_x + pb_w + 6.0, curr_y + 29.0, f"{comm_score} / 100")

        c.setFillColor(self.c_navy)
        c.setFont("Helvetica", 7.5)
        c.drawString(pb_x, curr_y + 17.0, "HR & Behavioral Performance")
        self._draw_horizontal_bar(c, pb_x, curr_y + 7.0, pb_w, 5.0, behav_score, self.c_bar_teal)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(pb_x + pb_w + 6.0, curr_y + 6.0, f"{behav_score} / 100")

        # Column C: Rubric Breakdown Table
        rb_x = start_x + 365.0
        rb_w = card_w - (rb_x - start_x) - 12.0
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 9.0)
        c.drawString(rb_x, curr_y + c3_h - 26.0, "Rubric Breakdown")

        tbl_y = curr_y + 7.0
        tbl_h = 75.0
        c.setStrokeColor(colors.HexColor("#CBD5E1"))
        c.setLineWidth(0.6)
        c.roundRect(rb_x, tbl_y, rb_w, tbl_h, 3.0, fill=0, stroke=1)

        c.setFillColor(colors.HexColor("#F1F5F9"))
        c.rect(rb_x, tbl_y + 60.0, rb_w, 15.0, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#475569"))
        c.setFont("Helvetica-Bold", 7.0)
        c.drawString(rb_x + 8.0, tbl_y + 64.5, "Category")
        c.drawRightString(rb_x + rb_w - 8.0, tbl_y + 64.5, "Score")

        c.setStrokeColor(colors.HexColor("#E2E8F0"))
        c.line(rb_x, tbl_y + 60.0, rb_x + rb_w, tbl_y + 60.0)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica", 7.5)
        c.drawString(rb_x + 8.0, tbl_y + 49.5, "Technical")
        c.drawRightString(rb_x + rb_w - 8.0, tbl_y + 49.5, f"{tech_score} / 100")

        c.line(rb_x, tbl_y + 45.0, rb_x + rb_w, tbl_y + 45.0)
        c.drawString(rb_x + 8.0, tbl_y + 34.5, "Communication")
        c.drawRightString(rb_x + rb_w - 8.0, tbl_y + 34.5, f"{comm_score} / 100")

        c.line(rb_x, tbl_y + 30.0, rb_x + rb_w, tbl_y + 30.0)
        c.drawString(rb_x + 8.0, tbl_y + 19.5, "Behavioral")
        c.drawRightString(rb_x + rb_w - 8.0, tbl_y + 19.5, f"{behav_score} / 100")

        c.line(rb_x, tbl_y + 15.0, rb_x + rb_w, tbl_y + 15.0)
        c.setFillColor(self.c_blue_banner)
        c.rect(rb_x, tbl_y, rb_w, 15.0, fill=1, stroke=0)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(rb_x + 8.0, tbl_y + 4.5, "Total")
        c.setFillColor(self.c_blue_text)
        c.drawRightString(rb_x + rb_w - 8.0, tbl_y + 4.5, f"{int(round(overall_score))} / 100")

        curr_y -= 9.0

        # -----------------------------------------------------
        # 4. Demonstrated Strengths Card (Light Green)
        # -----------------------------------------------------
        c4_item_h = 14.5
        c4_h = 24.0 + (len(strengths) * c4_item_h)
        curr_y = self._check_page_break(c, curr_y, c4_h, display_id)
        curr_y -= c4_h
        c.setFillColor(self.c_green_bg)
        c.setStrokeColor(self.c_green_border)
        c.setLineWidth(0.75)
        c.roundRect(start_x, curr_y, card_w, c4_h, 6.0, fill=1, stroke=1)

        self._draw_star_icon(c, start_x + 12.0, curr_y + c4_h - 18.0, 11.0)
        c.setFillColor(self.c_green_title)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(start_x + 28.0, curr_y + c4_h - 15.0, "4. Demonstrated Strengths")

        item_y = curr_y + c4_h - 32.0
        for s in strengths:
            self._draw_checkmark(c, start_x + 16.0, item_y + 1.0)
            c.setFillColor(self.c_navy)
            c.setFont("Helvetica", 8.0)
            c.drawString(start_x + 30.0, item_y + 2.0, s[:110])
            item_y -= c4_item_h

        curr_y -= 9.0

        # -----------------------------------------------------
        # 5. Issues Faced During Interview Card (Light Red)
        # -----------------------------------------------------
        c5_item_h = 14.5
        c5_h = 24.0 + (len(issues) * c5_item_h)
        curr_y = self._check_page_break(c, curr_y, c5_h, display_id)
        curr_y -= c5_h
        c.setFillColor(self.c_red_bg)
        c.setStrokeColor(self.c_red_border)
        c.setLineWidth(0.75)
        c.roundRect(start_x, curr_y, card_w, c5_h, 6.0, fill=1, stroke=1)

        self._draw_warning_icon(c, start_x + 12.0, curr_y + c5_h - 18.0, 11.0)
        c.setFillColor(self.c_red_title)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(start_x + 28.0, curr_y + c5_h - 15.0, "5. Issues Faced During Interview")

        item_y = curr_y + c5_h - 32.0
        for iss in issues:
            c.setFillColor(self.c_red_icon)
            c.circle(start_x + 19.0, item_y + 4.5, 2.0, fill=1, stroke=0)
            c.setFillColor(self.c_navy)
            c.setFont("Helvetica", 8.0)
            c.drawString(start_x + 30.0, item_y + 2.0, iss[:110])
            item_y -= c5_item_h

        curr_y -= 9.0

        # -----------------------------------------------------
        # 6. Areas for Improvement Card (Light Amber)
        # -----------------------------------------------------
        c6_item_h = 14.5
        c6_h = 24.0 + (len(improvements) * c6_item_h)
        curr_y = self._check_page_break(c, curr_y, c6_h, display_id)
        curr_y -= c6_h
        c.setFillColor(self.c_amber_bg)
        c.setStrokeColor(self.c_amber_border)
        c.setLineWidth(0.75)
        c.roundRect(start_x, curr_y, card_w, c6_h, 6.0, fill=1, stroke=1)

        self._draw_bulb_icon(c, start_x + 12.0, curr_y + c6_h - 18.0, 11.0)
        c.setFillColor(self.c_amber_title)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(start_x + 28.0, curr_y + c6_h - 15.0, "6. Areas for Improvement")

        item_y = curr_y + c6_h - 32.0
        for imp in improvements:
            c.setFillColor(self.c_amber_icon)
            c.circle(start_x + 19.0, item_y + 4.5, 2.0, fill=1, stroke=0)
            c.setFillColor(self.c_navy)
            c.setFont("Helvetica", 8.0)
            c.drawString(start_x + 30.0, item_y + 2.0, imp[:110])
            item_y -= c6_item_h

        curr_y -= 9.0

        # -----------------------------------------------------
        # 7. Final Feedback & Recommendation Card
        # -----------------------------------------------------
        fb_lines = self._wrap_text(final_feedback, max_chars=118)[:3]
        c7_h = 44.0 + (len(fb_lines) * 11.5) + 24.0
        curr_y = self._check_page_break(c, curr_y, c7_h, display_id)
        curr_y -= c7_h
        c.setFillColor(self.c_blue_light)
        c.setStrokeColor(self.c_blue_border)
        c.setLineWidth(0.75)
        c.roundRect(start_x, curr_y, card_w, c7_h, 6.0, fill=1, stroke=1)

        self._draw_chat_icon(c, start_x + 12.0, curr_y + c7_h - 18.0, 11.0)
        c.setFillColor(self.c_navy)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(start_x + 28.0, curr_y + c7_h - 15.0, "7. Final Feedback & Recommendation")

        f_y = curr_y + c7_h - 30.0
        c.setFillColor(colors.HexColor("#1E293B"))
        c.setFont("Helvetica", 8.0)
        for line in fb_lines:
            c.drawString(start_x + 14.0, f_y, line)
            f_y -= 11.5

        rec_strip_y = curr_y + 7.5
        rec_strip_h = 21.0
        rec_strip_w = card_w - 24.0
        c.setFillColor(self.c_blue_banner)
        c.setStrokeColor(self.c_blue_border)
        c.setLineWidth(0.75)
        c.roundRect(start_x + 12.0, rec_strip_y, rec_strip_w, rec_strip_h, 4.0, fill=1, stroke=1)

        self._draw_target_icon(c, start_x + 18.0, rec_strip_y + 4.5, 11.0)
        c.setFont("Helvetica-Bold", 8.0)
        c.setFillColor(self.c_blue_text)
        c.drawString(start_x + 35.0, rec_strip_y + 6.5, "Recommendation: ")
        c.setFont("Helvetica", 8.0)
        c.drawString(start_x + 107.0, rec_strip_y + 6.5, recommendation[:98])

        curr_y -= 9.0

        # -----------------------------------------------------
        # 8. Interview Integrity & Proctoring Summary (Optional)
        # -----------------------------------------------------
        proctoring = report_data.get("proctoring")
        if proctoring:
            p_events = proctoring.get("events") or []
            is_term = proctoring.get("is_terminated", False)
            warn_count = proctoring.get("warning_count", 0)
            crit_count = proctoring.get("critical_count", 0)
            term_reason = proctoring.get("termination_reason")

            event_rows = min(len(p_events), 3)
            c8_h = 44.0 + (event_rows * 12.0) + (16.0 if is_term and term_reason else 0.0)
            curr_y = self._check_page_break(c, curr_y, c8_h, display_id)
            curr_y -= c8_h

            if is_term:
                c.setFillColor(self.c_red_bg)
                c.setStrokeColor(self.c_red_border)
            elif crit_count > 0 or warn_count > 0:
                c.setFillColor(self.c_amber_bg)
                c.setStrokeColor(self.c_amber_border)
            else:
                c.setFillColor(self.c_blue_light)
                c.setStrokeColor(self.c_blue_border)

            c.setLineWidth(0.75)
            c.roundRect(start_x, curr_y, card_w, c8_h, 6.0, fill=1, stroke=1)

            self._draw_shield_icon(c, start_x + 12.0, curr_y + c8_h - 18.0, 11.0)
            c.setFillColor(self.c_navy)
            c.setFont("Helvetica-Bold", 10.5)
            c.drawString(start_x + 28.0, curr_y + c8_h - 15.0, "8. Interview Integrity & Automated Proctoring Log")

            pill_w = 110.0
            pill_h = 16.0
            pill_x = start_x + card_w - pill_w - 12.0
            pill_y = curr_y + c8_h - 20.0
            if is_term:
                c.setFillColor(colors.HexColor("#FEE2E2"))
                c.setStrokeColor(colors.HexColor("#F87171"))
                c.roundRect(pill_x, pill_y, pill_w, pill_h, pill_h / 2.0, fill=1, stroke=1)
                c.setFillColor(colors.HexColor("#DC2626"))
                c.setFont("Helvetica-Bold", 7.0)
                c.drawCentredString(pill_x + pill_w / 2.0, pill_y + 4.5, "✕ Terminated (Integrity)")
            elif warn_count > 0:
                c.setFillColor(colors.HexColor("#FEF3C7"))
                c.setStrokeColor(colors.HexColor("#FCD34D"))
                c.roundRect(pill_x, pill_y, pill_w, pill_h, pill_h / 2.0, fill=1, stroke=1)
                c.setFillColor(colors.HexColor("#B45309"))
                c.setFont("Helvetica-Bold", 7.0)
                c.drawCentredString(pill_x + pill_w / 2.0, pill_y + 4.5, f"⚠ Warnings ({warn_count})")
            else:
                c.setFillColor(colors.HexColor("#DCFCE7"))
                c.setStrokeColor(colors.HexColor("#86EFAC"))
                c.roundRect(pill_x, pill_y, pill_w, pill_h, pill_h / 2.0, fill=1, stroke=1)
                c.setFillColor(colors.HexColor("#15803D"))
                c.setFont("Helvetica-Bold", 7.0)
                c.drawCentredString(pill_x + pill_w / 2.0, pill_y + 4.5, "✓ Clean Session")

            content_y = curr_y + c8_h - 32.0
            c.setFont("Helvetica", 7.5)
            c.setFillColor(colors.HexColor("#475569"))
            c.drawString(start_x + 14.0, content_y, f"Monitoring Summary: {len(p_events)} event(s) recorded (Warnings: {warn_count}, Critical: {crit_count}). Client-side vision heuristics.")

            if is_term and term_reason:
                content_y -= 13.0
                c.setFillColor(self.c_red_title)
                c.setFont("Helvetica-Bold", 7.5)
                c.drawString(start_x + 14.0, content_y, f"Halt Reason: {term_reason[:105]}")

            for ev in p_events[:3]:
                content_y -= 12.0
                ev_type = ev.get("event_type", "Event").replace("_", " ").title()
                ev_time = ev.get("timestamp", "")
                ev_expl = ev.get("explanation", "")
                c.setFillColor(colors.HexColor("#334155"))
                c.setFont("Helvetica", 7.0)
                c.drawString(start_x + 14.0, content_y, f"• [{ev_time}] {ev_type}: {ev_expl[:95]}")

        c.showPage()
        c.save()
        return output_path


pdf_report_generator = StyledPDFReportGenerator()

def generate_styled_pdf_report(session_id: str, report_data: Dict[str, Any], output_path: str) -> str:
    """Entry point for generating styled PDF reports."""
    return pdf_report_generator.generate(session_id, report_data, output_path)
