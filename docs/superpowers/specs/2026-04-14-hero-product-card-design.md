# Hero Product Card Redesign - Design Spec

**Date**: 2026-04-14

## Overview
Redesign the hero product card to have a refined, production-level dashboard aesthetic with clean lines and professional polish.

## Visual Design

### Card Container
- Max-width: 480px
- Background: #ffffff
- Border: 1px solid rgba(0,0,0,0.06)
- Border-radius: 16px
- Box-shadow: `0 4px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`

### Layout Structure (top to bottom)
1. Flex row: Trust score circle (left) + Verdict badge (right)
2. Top issues list
3. Diff preview

## Components

### 1. Trust Score Circle
- Diameter: 140px
- Stroke width: 8px
- Background ring: #f3f4f6
- Progress ring: gradient #10b981 to #34d399
- Score 87 = 87% filled
- Score number: 72px, font-weight 600, #111827
- Label: 10px, uppercase, letter-spacing 0.1em, #6b7280
- Sub-label: 9px, #9ca3af

### 2. Verdict Badge
- Position: top-right inline
- Pill shape, padding 6px 12px
- Background: #ecfdf5
- Border: 1px solid #a7f3d0
- Text: SAFE, 10px, font-weight 700, #047857

### 3. Top Issues List
- Header: 11px, uppercase, letter-spacing 0.1em, #6b7280
- Items: padding 8px 0, border-bottom 1px solid #f3f4f6
- Severity badges:
  - High: #fef2f2 bg, #dc2626 text
  - Medium: #fffbeb bg, #d97706 text
  - Low: #f3f4f6 bg, #6b7280 text
- Issue title: 13px, font-weight 500, #111827
- File path: 11px, #9ca3af, monospace

### 4. Diff Preview
- Header: 11px, uppercase, letter-spacing 0.1em, #6b7280
- Container: bg #fafafa, border 1px solid #e5e7eb, radius 8px, padding 12px
- Line numbers: 12px, #9ca3af
- Prefix colors: + #16a34a, - #dc2626
- Code: 12px, monospace, #374151
- Show 3-4 lines max

## Colors (Tailwind reference)
- emerald-500: #10b981
- emerald-400: #34d399
- gray-50: #fafafa
- gray-100: #f3f4f6
- gray-200: #e5e7eb
- gray-400: #9ca3af
- gray-500: #6b7280
- gray-600: #4b5563
- gray-700: #374151
- gray-900: #111827
- red-600: #dc2626
- amber-600: #d97706
- emerald-600: #047857
- emerald-50: #ecfdf5
- red-50: #fef2f2
- amber-50: #fffbeb