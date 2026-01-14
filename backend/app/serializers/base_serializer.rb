class BaseSerializer
  attr_reader :object, :options

  def initialize(object, options = {})
    @object = object
    @options = options
  end

  def as_json
    raise NotImplementedError, "#{self.class} must implement #as_json"
  end

  private

  def format_date(date)
    date&.iso8601
  end

  def format_datetime(datetime)
    datetime&.iso8601
  end

  def format_currency(amount)
    amount&.to_f
  end
end
