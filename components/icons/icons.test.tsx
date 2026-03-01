import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  PlayIcon,
  SkipIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  DragIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlayNextIcon,
  ShareIcon,
  MailIcon,
  ChevronLeftIcon,
  CloseIcon,
  YoutubeIcon,
  TwitterIcon,
  RedditIcon,
  NoteIcon,
  LinkIcon,
  ImageIcon,
  CheckIcon,
  CheckCircleIcon,
  LoaderIcon,
  AlertIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
  TvIcon,
  HistoryIcon,
  LockIcon,
  UserIcon,
} from './index'

describe('Icon components', () => {
  const icons = [
    { name: 'PlayIcon', Component: PlayIcon },
    { name: 'SkipIcon', Component: SkipIcon },
    { name: 'PlusIcon', Component: PlusIcon },
    { name: 'EditIcon', Component: EditIcon },
    { name: 'TrashIcon', Component: TrashIcon },
    { name: 'DragIcon', Component: DragIcon },
    { name: 'ArrowUpIcon', Component: ArrowUpIcon },
    { name: 'ArrowDownIcon', Component: ArrowDownIcon },
    { name: 'PlayNextIcon', Component: PlayNextIcon },
    { name: 'ShareIcon', Component: ShareIcon },
    { name: 'MailIcon', Component: MailIcon },
    { name: 'ChevronLeftIcon', Component: ChevronLeftIcon },
    { name: 'CloseIcon', Component: CloseIcon },
    { name: 'YoutubeIcon', Component: YoutubeIcon },
    { name: 'TwitterIcon', Component: TwitterIcon },
    { name: 'RedditIcon', Component: RedditIcon },
    { name: 'NoteIcon', Component: NoteIcon },
    { name: 'LinkIcon', Component: LinkIcon },
    { name: 'ImageIcon', Component: ImageIcon },
    { name: 'CheckIcon', Component: CheckIcon },
    { name: 'LoaderIcon', Component: LoaderIcon },
    { name: 'UsersIcon', Component: UsersIcon },
    { name: 'TvIcon', Component: TvIcon },
    { name: 'HistoryIcon', Component: HistoryIcon },
  ]

  it.each(icons)('$name renders an SVG element', ({ Component }) => {
    const { container } = render(<Component />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('CheckCircleIcon renders with default props', () => {
    const { container } = render(<CheckCircleIcon />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('CheckCircleIcon renders filled variant', () => {
    const { container } = render(<CheckCircleIcon filled={true} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('fill')).toBe('currentColor')
  })

  it('AlertIcon renders with custom size', () => {
    const { container } = render(<AlertIcon size={24} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('24')
  })

  it('ClockIcon renders with custom size', () => {
    const { container } = render(<ClockIcon size={20} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('20')
  })

  it('CalendarIcon renders with custom size', () => {
    const { container } = render(<CalendarIcon size={24} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('24')
  })

  it('UserIcon renders with custom size', () => {
    const { container } = render(<UserIcon size={32} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('32')
  })

  it('LockIcon renders with custom size', () => {
    const { container } = render(<LockIcon size={24} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('24')
  })

  it('CloseIcon renders with custom size', () => {
    const { container } = render(<CloseIcon size={32} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('32')
  })
})
