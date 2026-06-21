import { LINE_EVENT_TYPES, type LineRoutingDestination, type LineRoutingEvent } from "./line-types";

const supportedEvents = new Set<string>(LINE_EVENT_TYPES);

export function selectLineDestinations<T extends LineRoutingDestination>(event: LineRoutingEvent, destinations: T[]) {
  if (!supportedEvents.has(event.eventType)) return [];

  return destinations.filter((destination) => {
    if (!destination.active) return false;
    if (destination.categoryId && destination.categoryId !== event.categoryId) return false;
    return destination.settings.some((setting) => setting.eventType === event.eventType && setting.enabled);
  });
}
