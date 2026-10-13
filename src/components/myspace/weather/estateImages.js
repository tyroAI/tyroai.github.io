import day from "@/assets/estate.webp"
import night from "@/assets/estate-night.webp"
import cloudy from "@/assets/estate-cloudy.webp"
import cloudyNight from "@/assets/estate-cloudy-night.webp"
import rain from "@/assets/estate-rain.webp"
import rainNight from "@/assets/estate-rain-night.webp"
import snow from "@/assets/estate-snow.webp"
import snowNight from "@/assets/estate-snow-night.webp"
import fog from "@/assets/estate-fog.webp"
import fogNight from "@/assets/estate-fog-night.webp"

const SCENES = {
  sunny: [day, night],
  cloudy: [cloudy, cloudyNight],
  rain: [rain, rainNight],
  storm: [rain, rainNight],
  snow: [snow, snowNight],
  fog: [fog, fogNight],
}

export function estateImage(weather, isNight) {
  return (SCENES[weather] ?? SCENES.cloudy)[isNight ? 1 : 0]
}
