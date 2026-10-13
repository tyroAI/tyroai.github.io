import { SidePreview } from "./preview/SidePreview"

/** Toplantı satırının yan önizlemesi — `SidePreview`in toplantı hâli. */
export function EventSidePreview({ event, ...rest }) {
  return <SidePreview kind="event" item={event} {...rest} />
}
