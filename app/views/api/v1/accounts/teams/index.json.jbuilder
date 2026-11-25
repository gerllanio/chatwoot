json.array! @teams do |team|
  json.partial! 'api/v1/models/team', formats: [:json], resource: team
  # GTI "Work": the queue colour chosen in the queue greeting, for cards and chips.
  json.gti_color team.gti_setting&.color
end
