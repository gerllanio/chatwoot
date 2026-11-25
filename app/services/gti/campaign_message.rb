# Fills the variables a GTI campaign text may carry with the recipient's name.
# Accepts the Ticketz spelling ({nome}) and the Chatwoot one ({{name}}, {{first_name}}).
module Gti::CampaignMessage
  module_function

  FULL_NAME = /\{nome\}|\{\{\s*name\s*\}\}/i
  FIRST_NAME = /\{primeiro_nome\}|\{\{\s*first_?name\s*\}\}/i

  def render(text, name)
    full_name = name.to_s.strip
    first_name = full_name.split.first.to_s
    text.to_s.gsub(FULL_NAME, full_name).gsub(FIRST_NAME, first_name)
  end
end
