Rails.application.routes.draw do
  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # API v1
  namespace :api do
    namespace :v1 do
      # User memberships
      resources :memberships, only: [ :index, :show ] do
        collection do
          get :current
        end
      end

      # Payments
      resources :payments, only: [ :index, :show, :create ]

      # Conversations (requires active membership)
      resources :conversations, only: [ :index, :create ]

      # Admin endpoints
      namespace :admin do
        resources :memberships, only: [ :index, :show, :create, :destroy ]
      end
    end
  end
end
