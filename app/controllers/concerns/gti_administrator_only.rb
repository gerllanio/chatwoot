# GTI "Work" admin-only pages (campaigns, contact lists): only account administrators.
module GtiAdministratorOnly
  extend ActiveSupport::Concern

  included do
    before_action :ensure_administrator
  end

  private

  def ensure_administrator
    raise Pundit::NotAuthorizedError unless Current.account_user&.administrator?
  end
end
