import DateTimePicker from '@react-native-community/datetimepicker'
import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { useEffect, useMemo, useState } from 'react'
import MapView, { Circle, Marker } from 'react-native-maps'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { TfButton } from '@/components/ui/TfButton'
import type { LocationCatalogEntry } from '@/data/locationsCatalog'
import { searchLocationsCatalog } from '@/data/locationsCatalog'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import { getMatchLocationFromDevice } from '@/lib/match/getDeviceLocation'
import {
  formatDateDisplay,
  formatLocationLine,
  formatRadiusMiles,
  formatTimeDisplay,
  MAX_STYLE_TAGS,
} from '@/lib/match/refinementFormat'
import type {
  MatchDatePreset,
  MatchRefinement,
  MatchTimeBlock,
} from '@/types'

const TAG_OPTIONS = ['bold', 'natural', 'soft glam', 'clean', 'editorial', 'classic', 'trendy'] as const

const TAG_OPTION_SET = new Set<string>(TAG_OPTIONS)

const MAX_CUSTOM_TAG_LEN = 28

function isPresetTag(t: string): boolean {
  return TAG_OPTION_SET.has(t)
}

const DATE_PRESETS: { key: MatchDatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_weekend', label: 'This weekend' },
  { key: 'next_week', label: 'Next week' },
  { key: 'anytime', label: 'Anytime' },
]

const TIME_BLOCKS: { key: MatchTimeBlock; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
  { key: 'night', label: 'Night' },
]

const DEFAULT_RADIUS_MILES = 25
const MILES_TO_METERS = 1609.34
const MIN_RADIUS_MILES = 1
const MAX_RADIUS_MILES = 25

function clampRadiusMiles(radiusMiles: number | undefined): number {
  const value = radiusMiles ?? DEFAULT_RADIUS_MILES
  return Math.min(MAX_RADIUS_MILES, Math.max(MIN_RADIUS_MILES, Math.round(value)))
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#10192f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#10192f' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#223150' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#24344f' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#182235' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
] as const

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toIsoTimeLocal(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function parseIsoTime(iso: string): Date {
  const [hours, minutes] = iso.split(':').map(Number)
  const next = new Date()
  next.setHours(hours ?? 9, minutes ?? 0, 0, 0)
  return next
}

function formatDateChipLabel(iso: string): string {
  if (!iso.trim()) return 'Pick a date'
  return parseIsoDate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTimeChipLabel(iso: string): string {
  if (!iso.trim()) return 'Pick a time'
  return parseIsoTime(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export type MatchRefinementSection = 'location' | 'dateTime' | 'tags'

export type MatchRefinementStepProps = {
  section: MatchRefinementSection
  refinement: MatchRefinement
  tags: string[]
  onChange: (next: { refinement: MatchRefinement; tags: string[]; locationLine: string }) => void
}

export function MatchRefinementStep({ section, refinement, tags, onChange }: MatchRefinementStepProps) {
  const [search, setSearch] = useState('')
  const [locating, setLocating] = useState(false)
  const [datePickerMode, setDatePickerMode] = useState<null | 'exact' | 'rangeStart' | 'rangeEnd'>(null)
  const [pickerDate, setPickerDate] = useState(() => new Date())
  const [timePickerMode, setTimePickerMode] = useState<null | 'exact' | 'rangeStart' | 'rangeEnd'>(null)
  const [pickerTime, setPickerTime] = useState(() => parseIsoTime('09:00'))
  const [customTagInput, setCustomTagInput] = useState('')
  const [displayRadiusMiles, setDisplayRadiusMiles] = useState(refinement.radiusMiles ?? DEFAULT_RADIUS_MILES)

  const suggestions = useMemo(() => searchLocationsCatalog(search), [search])

  useEffect(() => {
    const target = refinement.radiusMiles ?? DEFAULT_RADIUS_MILES
    setDisplayRadiusMiles((current) => {
      if (current === target) return current
      return current
    })

    let frame = 0
    const start = Date.now()
    const origin = displayRadiusMiles
    const durationMs = 180

    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(1, elapsed / durationMs)
      const eased = 1 - (1 - progress) * (1 - progress)
      const next = origin + (target - origin) * eased
      setDisplayRadiusMiles(next)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [refinement.radiusMiles])

  function patchRefinement(partial: MatchRefinement) {
    const next: MatchRefinement = { ...refinement, ...partial }
    const line = next.location ? formatLocationLine(next.location) : ''
    onChange({ refinement: next, tags, locationLine: line })
  }

  function setTags(nextTags: string[]) {
    const line = refinement.location ? formatLocationLine(refinement.location) : ''
    onChange({ refinement, tags: nextTags, locationLine: line })
  }

  async function onUseDeviceLocation() {
    setLocating(true)
    try {
      const result = await getMatchLocationFromDevice()
      if (!result.ok) {
        if (result.reason === 'denied') {
          if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          }
          Alert.alert(
            'Location off',
            'Enable location access in Settings to use your current area for matching, or search for a city or zip instead.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => void Linking.openSettings() },
            ],
          )
        } else {
          Alert.alert(
            'Location unavailable',
            'Use search to pick a city or zip from the list.',
          )
        }
        return
      }
      patchRefinement({ location: result.location, radiusMiles: refinement.radiusMiles ?? DEFAULT_RADIUS_MILES })
      setSearch('')
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
    } catch {
      Alert.alert('Location unavailable', 'Use search to pick a city or zip from the list.')
    } finally {
      setLocating(false)
    }
  }

  function onPickCatalog(row: LocationCatalogEntry) {
    patchRefinement({
      location: {
        source: 'manual',
        city: row.city,
        state: row.state,
        zip: row.zip,
        latitude: row.latitude,
        longitude: row.longitude,
      },
      radiusMiles: refinement.radiusMiles ?? DEFAULT_RADIUS_MILES,
    })
    setSearch(`${row.city}, ${row.state}`)
  }

  function setRadiusMiles(radiusMiles: number) {
    patchRefinement({ radiusMiles })
  }

  function setDatePreset(preset: MatchDatePreset) {
    setDatePickerMode(null)
    patchRefinement({ date: { type: 'preset', preset } })
  }

  function clearDateSelection() {
    setDatePickerMode(null)
    patchRefinement({ date: undefined })
  }

  function openDatePicker() {
    const cur =
      refinement.date?.type === 'range'
        ? parseIsoDate(refinement.date.endDate)
        : refinement.date?.type === 'exact'
          ? parseIsoDate(refinement.date.exactDate)
          : new Date()
    setPickerDate(cur)
    setDatePickerMode(refinement.date ? 'rangeEnd' : 'exact')
  }

  function onDatePicked(
    e: { type?: string } | unknown,
    selected?: Date,
  ) {
    const mode = datePickerMode
    if (Platform.OS === 'android') {
      setDatePickerMode(null)
    }
    const ev = e as { type?: string }
    if (Platform.OS === 'android' && ev?.type === 'dismissed') return
    if (!selected || !mode) return
    setPickerDate(selected)
    applyDateSelection(mode, selected)
  }

  function applyDateSelection(mode: 'exact' | 'rangeStart' | 'rangeEnd', selected: Date) {
    const iso = toIsoDateLocal(selected)
    if (mode === 'exact') {
      patchRefinement({ date: { type: 'exact', exactDate: iso } })
    } else if (mode === 'rangeStart') {
      const end =
        refinement.date?.type === 'range' ? refinement.date.endDate : iso
      let startIso = iso
      let endIso = end
      if (startIso > endIso) endIso = startIso
      if (startIso === endIso) {
        patchRefinement({ date: { type: 'exact', exactDate: startIso } })
      } else {
        patchRefinement({ date: { type: 'range', startDate: startIso, endDate: endIso } })
      }
    } else if (mode === 'rangeEnd') {
      const start =
        refinement.date?.type === 'range'
          ? refinement.date.startDate
          : refinement.date?.type === 'exact'
            ? refinement.date.exactDate
            : iso
      let startIso = start
      let endIso = iso
      if (endIso < startIso) startIso = endIso
      if (startIso === endIso) {
        patchRefinement({ date: { type: 'exact', exactDate: startIso } })
      } else {
        patchRefinement({ date: { type: 'range', startDate: startIso, endDate: endIso } })
      }
    }
  }

  function toggleTimeBlock(block: MatchTimeBlock) {
    const blocks = refinement.time?.type === 'block' ? refinement.time.blocks : []
    const has = blocks.includes(block)
    let nextBlocks: MatchTimeBlock[]
    if (has) {
      nextBlocks = blocks.filter((b) => b !== block)
    } else {
      if (blocks.length >= 4) return
      nextBlocks = [...blocks, block]
    }
    patchRefinement({
      time: { type: 'block', blocks: nextBlocks },
    })
  }

  function openTimePicker() {
    const cur =
      refinement.time?.type === 'range'
        ? parseIsoTime(refinement.time.endTime)
        : refinement.time?.type === 'exact'
          ? parseIsoTime(refinement.time.exactTime)
          : parseIsoTime('09:00')
    setPickerTime(cur)
    setTimePickerMode(refinement.time ? 'rangeEnd' : 'exact')
  }

  function clearTimeSelection() {
    setTimePickerMode(null)
    patchRefinement({ time: undefined })
  }

  function onTimePicked(
    e: { type?: string } | unknown,
    selected?: Date,
  ) {
    const mode = timePickerMode
    if (Platform.OS === 'android') {
      setTimePickerMode(null)
    }
    const ev = e as { type?: string }
    if (Platform.OS === 'android' && ev?.type === 'dismissed') return
    if (!selected || !mode) return
    setPickerTime(selected)
    applyTimeSelection(mode, selected)
  }

  function applyTimeSelection(mode: 'exact' | 'rangeStart' | 'rangeEnd', selected: Date) {
    const iso = toIsoTimeLocal(selected)
    if (mode === 'exact') {
      patchRefinement({ time: { type: 'exact', exactTime: iso } })
      return
    }
    if (mode === 'rangeStart') {
      const end = refinement.time?.type === 'range' ? refinement.time.endTime : iso
      let startIso = iso
      let endIso = end
      if (startIso > endIso) endIso = startIso
      if (startIso === endIso) {
        patchRefinement({ time: { type: 'exact', exactTime: startIso } })
      } else {
        patchRefinement({ time: { type: 'range', startTime: startIso, endTime: endIso } })
      }
      return
    }
    const start =
      refinement.time?.type === 'range'
        ? refinement.time.startTime
        : refinement.time?.type === 'exact'
          ? refinement.time.exactTime
          : iso
    let startIso = start
    let endIso = iso
    if (endIso < startIso) startIso = endIso
    if (startIso === endIso) {
      patchRefinement({ time: { type: 'exact', exactTime: startIso } })
    } else {
      patchRefinement({ time: { type: 'range', startTime: startIso, endTime: endIso } })
    }
  }

  function toggleTag(tag: string) {
    const has = tags.includes(tag)
    let next = has ? tags.filter((t) => t !== tag) : [...tags, tag]
    if (!has && next.length > MAX_STYLE_TAGS) {
      next = next.slice(0, MAX_STYLE_TAGS)
    }
    setTags(next)
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim()
    if (!trimmed) return
    if (tags.length >= MAX_STYLE_TAGS) return
    const lower = trimmed.toLowerCase()
    const presetMatch = TAG_OPTIONS.find((p) => p.toLowerCase() === lower)
    if (presetMatch) {
      if (!tags.includes(presetMatch)) {
        setTags([...tags, presetMatch])
      }
      setCustomTagInput('')
      return
    }
    const value = trimmed.replace(/\s+/g, ' ').slice(0, MAX_CUSTOM_TAG_LEN)
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setCustomTagInput('')
      return
    }
    setTags([...tags, value])
    setCustomTagInput('')
  }

  const customTagsOnly = tags.filter((t) => !isPresetTag(t))

  const datePresetActive = (p: MatchDatePreset) =>
    refinement.date?.type === 'preset' && refinement.date.preset === p
  const exactActive = refinement.date?.type === 'exact'
  const rangeActive = refinement.date?.type === 'range'
  const dateSelected = Boolean(refinement.date)
  const showDatePicker = datePickerMode !== null
  const timeType = refinement.time?.type
  const exactTimeActive = timeType === 'exact'
  const rangeTimeActive = timeType === 'range'
  const blockTimeActive = timeType === 'block' && (refinement.time?.blocks?.length ?? 0) > 0
  const timeSelected = Boolean(
    refinement.time &&
      ((refinement.time.type === 'block' && refinement.time.blocks.length > 0) ||
        refinement.time.type === 'exact' ||
        refinement.time.type === 'range'),
  )
  const showTimePicker = timePickerMode !== null

  const loc = refinement.location
  const selectedRadiusMiles = clampRadiusMiles(refinement.radiusMiles)
  const displayRadiusMeters = displayRadiusMiles * MILES_TO_METERS
  const mapLatitudeDelta = Math.max(0.018, (displayRadiusMiles / 69) * 1.8)
  const cosLatitude = Math.max(Math.cos(((loc?.latitude ?? 0) * Math.PI) / 180), 0.2)
  const mapLongitudeDelta = mapLatitudeDelta / cosLatitude

  const locationBlock = (
    <>
      <Text style={styles.fieldLabel}>Location</Text>
      <Pressable
        onPress={() => void onUseDeviceLocation()}
        disabled={locating}
        style={({ pressed }) => [styles.locationHero, pressed && styles.pressed, locating && styles.locatingDim]}
      >
        {locating ? (
          <ActivityIndicator color={TrustfallColors.primaryForeground} />
        ) : (
          <Text style={styles.locationHeroText}>Use my current location</Text>
        )}
        <Text style={styles.locationHeroHint}>Uses GPS, then saves city / state / zip for matching</Text>
      </Pressable>

      {loc ? (
        <View style={styles.selectedBanner}>
          <Text style={styles.selectedBannerText}>
            {loc.source === 'current_location' ? 'Current: ' : 'Selected: '}
            {formatLocationLine(loc)}
          </Text>
        </View>
      ) : null}

      <Text style={styles.fieldLabel}>Or search city or zip</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search city or zip"
        placeholderTextColor={TrustfallColors.muted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {suggestions.length > 0 ? (
        <View style={styles.suggestList} accessibilityRole="list">
          {suggestions.map((item) => (
            <Pressable key={item.id} onPress={() => onPickCatalog(item)} style={styles.suggestRow}>
              <Text style={styles.suggestTitle}>
                {item.city}, {item.state} {item.zip}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {loc ? (
        <View style={styles.mapCard}>
          <MapView
            style={styles.map}
            pointerEvents="none"
            customMapStyle={DARK_MAP_STYLE as never}
            region={{
              latitude: loc.latitude,
              longitude: loc.longitude,
              latitudeDelta: mapLatitudeDelta,
              longitudeDelta: mapLongitudeDelta,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            showsCompass={false}
          >
            <Marker coordinate={{ latitude: loc.latitude, longitude: loc.longitude }} />
            <Circle
              center={{ latitude: loc.latitude, longitude: loc.longitude }}
              radius={displayRadiusMeters}
              strokeWidth={2}
              strokeColor="rgba(88,136,255,0.9)"
              fillColor="rgba(88,136,255,0.18)"
            />
          </MapView>
        </View>
      ) : null}

      <Text style={styles.fieldLabel}>Radius</Text>
      <View style={styles.radiusHeader}>
        <Text style={styles.hint}>Search within your selected area.</Text>
        <Text style={styles.radiusValue}>{formatRadiusMiles(selectedRadiusMiles)}</Text>
      </View>
      <View style={styles.radiusSliderWrap}>
        <Slider
          minimumValue={MIN_RADIUS_MILES}
          maximumValue={MAX_RADIUS_MILES}
          step={1}
          value={selectedRadiusMiles}
          minimumTrackTintColor={TrustfallColors.primary}
          maximumTrackTintColor={TrustfallColors.border}
          thumbTintColor={TrustfallColors.primary}
          onValueChange={(next) => setRadiusMiles(Math.round(next))}
        />
        <View style={styles.radiusMidpointRow} pointerEvents="none">
          {Array.from({ length: MAX_RADIUS_MILES - MIN_RADIUS_MILES + 1 }, (_, index) => {
            const mile = MIN_RADIUS_MILES + index
            const major = mile === 1 || mile === 5 || mile === 10 || mile === 25
            return (
              <View key={`mile-${mile}`} style={styles.radiusMidpointSlot}>
                <View style={[styles.radiusMidpointTick, major && styles.radiusMidpointTickMajor]} />
              </View>
            )
          })}
        
        </View>
        <View style={styles.radiusScale}>
          <Text style={styles.radiusScaleLabel}>1 mi</Text>
          <Text style={styles.radiusScaleLabel}>5 mi</Text>
          <Text style={styles.radiusScaleLabel}>10 mi</Text>
          <Text style={styles.radiusScaleLabel}>25 mi</Text>
        </View>
      </View>
    </>
  )

  const dateTimeBlock = (
    <View style={styles.dateTimeStack}>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Date</Text>
        {dateSelected ? (
          <Pressable onPress={clearDateSelection} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.quickPresetRow}>
        {DATE_PRESETS.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setDatePreset(key)}
            style={[
              styles.presetChip,
              styles.quickPresetChip,
              datePresetActive(key) && styles.presetChipOn,
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.presetChipText,
                styles.quickPresetChipText,
                datePresetActive(key) && styles.presetChipTextOn,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={openDatePicker}
        style={[styles.secondaryPick, dateSelected && styles.secondaryPickOn]}
      >
        <Text style={[styles.secondaryPickText, dateSelected && styles.secondaryPickTextOn]}>
          {rangeActive && refinement.date?.type === 'range'
            ? `${formatDateChipLabel(refinement.date.startDate)} – ${formatDateChipLabel(refinement.date.endDate)}`
            : exactActive && refinement.date?.type === 'exact'
              ? formatDateChipLabel(refinement.date.exactDate)
              : refinement.date?.type === 'preset'
                ? formatDateDisplay(refinement.date)
              : 'Pick dates'}
        </Text>
      </Pressable>
      {exactActive ? (
        <Text style={styles.hint}>Pick again to add an end date.</Text>
      ) : null}
      {showDatePicker ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          textColor={Platform.OS === 'ios' ? TrustfallColors.foreground : undefined}
          onChange={(e, d) => {
            onDatePicked(e, d)
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && showDatePicker ? (
        <TfButton
          title="Done"
          size="compact"
          onPress={() => {
            if (datePickerMode) {
              applyDateSelection(datePickerMode, pickerDate)
            }
            setDatePickerMode(null)
          }}
          style={styles.dateDone}
        />
      ) : null}

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Time</Text>
        {timeSelected ? (
          <Pressable onPress={clearTimeSelection} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hint}>Choose broad windows, one exact time, or a custom time range.</Text>
      <View style={styles.quickPresetRow}>
        {TIME_BLOCKS.map(({ key, label }) => {
          const on = refinement.time?.type === 'block' && refinement.time.blocks.includes(key)
          return (
            <Pressable
              key={key}
              onPress={() => toggleTimeBlock(key)}
              style={[styles.timeChip, styles.quickPresetChip, on && styles.timeChipOn]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.timeChipText, styles.quickPresetChipText, on && styles.timeChipTextOn]}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <Pressable
        onPress={openTimePicker}
        style={[styles.secondaryPick, timeSelected && styles.secondaryPickOn]}
      >
        <Text
          style={[
            styles.secondaryPickText,
            timeSelected && styles.secondaryPickTextOn,
          ]}
        >
          {rangeTimeActive && refinement.time?.type === 'range'
            ? `${formatTimeChipLabel(refinement.time.startTime)} – ${formatTimeChipLabel(refinement.time.endTime)}`
            : exactTimeActive && refinement.time?.type === 'exact'
              ? formatTimeChipLabel(refinement.time.exactTime)
              : blockTimeActive && refinement.time
                ? formatTimeDisplay(refinement.time)
              : 'Pick time(s)'}
        </Text>
      </Pressable>
      {exactTimeActive ? (
        <Text style={styles.hint}>Pick again to add an end time.</Text>
      ) : null}
      {showTimePicker ? (
        <DateTimePicker
          value={pickerTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          textColor={Platform.OS === 'ios' ? TrustfallColors.foreground : undefined}
          onChange={(e, d) => {
            onTimePicked(e, d)
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && showTimePicker ? (
        <TfButton
          title="Done"
          size="compact"
          onPress={() => {
            if (timePickerMode) {
              applyTimeSelection(timePickerMode, pickerTime)
            }
            setTimePickerMode(null)
          }}
          style={styles.dateDone}
        />
      ) : null}
      {refinement.time ? (
        <Text style={styles.mutedSmall}>{formatTimeDisplay(refinement.time)}</Text>
      ) : null}
    </View>
  )

  const tagsBlock = (
    <>
      <Text style={styles.fieldLabel}>Style tags</Text>
      <Text style={styles.hint}>
        Optional — helps matching. Pick up to {MAX_STYLE_TAGS} suggestions or add your own.
      </Text>
      <View style={styles.tagWrap}>
        {TAG_OPTIONS.map((tag) => {
          const on = tags.includes(tag)
          return (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.tag, on && styles.tagOn]}
            >
              <Text style={[styles.tagText, on && styles.tagTextOn]}>{formatDisplayLabel(tag)}</Text>
            </Pressable>
          )
        })}
      </View>
      {customTagsOnly.length > 0 ? (
        <View style={styles.tagWrap}>
          {customTagsOnly.map((tag) => (
            <Pressable key={tag} onPress={() => removeTag(tag)} style={[styles.tag, styles.tagOn]}>
              <Text style={[styles.tagText, styles.tagTextOn]}>
                {formatDisplayLabel(tag)}
                <Text style={styles.tagDismiss}>  ×</Text>
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={styles.fieldLabel}>Add your own</Text>
      <View style={styles.addTagRow}>
        <TextInput
          value={customTagInput}
          onChangeText={setCustomTagInput}
          placeholder="e.g. grunge, bridal, low-maintenance"
          placeholderTextColor={TrustfallColors.muted}
          style={styles.addTagInput}
          autoCapitalize="none"
          autoCorrect
          maxLength={MAX_CUSTOM_TAG_LEN + 8}
          onSubmitEditing={addCustomTag}
          returnKeyType="done"
        />
        <TfButton
          title="Add"
          variant="secondary"
          size="compact"
          onPress={addCustomTag}
          disabled={!customTagInput.trim() || tags.length >= MAX_STYLE_TAGS}
          style={styles.addTagBtn}
        />
      </View>
    </>
  )

  let heading: { title: string; body: string }
  if (section === 'location') {
    heading = {
      title: 'Where should we match?',
      body: 'Pick your area and search radius so we can rank pros near you.',
    }
  } else if (section === 'dateTime') {
    heading = {
      title: 'When works for you?',
      body: 'Choose today or use one picker for dates and one for time. First pick is single, second pick becomes a range.',
    }
  } else {
    heading = {
      title: 'Style tags',
      body: 'Totally optional - tags sharpen matchmaking when you use them.',
    }
  }

  return (
    <View style={[styles.wrap, section === 'dateTime' && styles.wrapDateTime]}>
      <Text style={styles.h2}>{heading.title}</Text>
      <Text style={[styles.body, section === 'dateTime' && styles.bodyDateTime]}>{heading.body}</Text>

      {section === 'location' ? locationBlock : null}
      {section === 'dateTime' ? dateTimeBlock : null}
      {section === 'tags' ? tagsBlock : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: TrustfallSpacing.lg },
  wrapDateTime: { gap: TrustfallSpacing.md },
  h2: { fontSize: 31, fontWeight: '700', color: TrustfallColors.foreground, letterSpacing: -0.4 },
  body: { fontSize: 17, lineHeight: 26, color: TrustfallColors.muted },
  bodyDateTime: { fontSize: 16, lineHeight: 24 },
  dateTimeStack: { gap: TrustfallSpacing.sm },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearBtn: {
    paddingHorizontal: TrustfallSpacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: TrustfallColors.muted,
  },
  hint: { fontSize: 14, lineHeight: 20, color: TrustfallColors.muted, marginTop: -2 },
  locationHero: {
    borderRadius: TrustfallRadius.lg,
    paddingVertical: TrustfallSpacing.lg,
    paddingHorizontal: TrustfallSpacing.lg,
    backgroundColor: TrustfallColors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    gap: TrustfallSpacing.xs,
  },
  locatingDim: { opacity: 0.85 },
  locationHeroText: {
    fontSize: 16,
    fontWeight: '800',
    color: TrustfallColors.primaryForeground,
    letterSpacing: -0.2,
  },
  locationHeroHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  pressed: { opacity: 0.92 },
  selectedBanner: {
    borderRadius: TrustfallRadius.md,
    padding: TrustfallSpacing.md,
    backgroundColor: 'rgba(47,99,230,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(47,99,230,0.35)',
  },
  selectedBannerText: { fontSize: 13, fontWeight: '600', color: TrustfallColors.foreground },
  mapCard: {
    height: 188,
    borderRadius: TrustfallRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(88,136,255,0.28)',
    backgroundColor: '#10192f',
    shadowColor: '#2f63e6',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  radiusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: TrustfallSpacing.md,
  },
  radiusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: TrustfallColors.foreground,
  },
  radiusSliderWrap: {
    borderRadius: TrustfallRadius.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    paddingHorizontal: TrustfallSpacing.md,
    paddingTop: TrustfallSpacing.sm,
    paddingBottom: TrustfallSpacing.md,
  },
  radiusMidpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
    marginBottom: 2,
    paddingHorizontal: 10,
  },
  radiusMidpointSlot: {
    flex: 1,
    alignItems: 'center',
  },
  radiusMidpointTick: {
    width: 2,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  radiusMidpointTickMajor: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  radiusScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  radiusScaleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TrustfallColors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    padding: TrustfallSpacing.lg,
    fontSize: 16,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.surface,
  },
  suggestList: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.surface,
    overflow: 'hidden',
  },
  suggestRow: {
    paddingVertical: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TrustfallColors.border,
  },
  suggestTitle: { fontSize: 15, fontWeight: '600', color: TrustfallColors.foreground },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  quickPresetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetChip: {
    minHeight: 44,
    paddingVertical: TrustfallSpacing.sm,
    paddingHorizontal: TrustfallSpacing.md,
    borderRadius: TrustfallRadius.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  quickPresetChip: {
    width: '23%',
    minWidth: 0,
    paddingHorizontal: TrustfallSpacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: 'rgba(47,99,230,0.2)',
  },
  presetChipText: { fontSize: 14, fontWeight: '700', color: TrustfallColors.muted },
  quickPresetChipText: { fontSize: 11, textAlign: 'center' },
  presetChipTextOn: { color: TrustfallColors.foreground },
  secondaryPick: {
    width: '100%',
    minHeight: 48,
    paddingVertical: TrustfallSpacing.sm,
    paddingHorizontal: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    justifyContent: 'center',
  },
  secondaryPickHalf: { flex: 1, minWidth: 0 },
  secondaryPickOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: 'rgba(47,99,230,0.12)',
  },
  secondaryPickText: { fontSize: 14, fontWeight: '700', color: TrustfallColors.accent },
  secondaryPickTextOn: { color: TrustfallColors.foreground },
  dateDone: { alignSelf: 'flex-start', marginTop: TrustfallSpacing.sm },
  timeChip: {
    minHeight: 44,
    paddingVertical: TrustfallSpacing.sm,
    paddingHorizontal: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  timeChipOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: TrustfallColors.primary,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: TrustfallColors.muted,
  },
  timeChipTextOn: { color: TrustfallColors.primaryForeground },
  mutedSmall: { fontSize: 12, color: TrustfallColors.secondary },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.lg,
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.sm,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  tagOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: TrustfallColors.primary,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: TrustfallColors.muted,
  },
  tagTextOn: { color: TrustfallColors.primaryForeground },
  tagDismiss: { fontSize: 12, fontWeight: '800', opacity: 0.85 },
  addTagRow: { flexDirection: 'row', gap: TrustfallSpacing.sm, alignItems: 'center' },
  addTagInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    paddingVertical: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.lg,
    fontSize: 15,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.surface,
  },
  addTagBtn: { flexShrink: 0 },
})
