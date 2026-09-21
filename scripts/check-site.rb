# Run after: bundle exec jekyll build --safe --destination /tmp/blog-build
require "pathname"

site = Pathname.new(ARGV.fetch(0))
%w[index.html about/index.html resume/index.html category/ai/index.html].each do |path|
  html = site.join(path).read
  %w[og:image twitter:image].each do |tag|
    raise "Wrong thumbnail: #{path} #{tag}" unless html.match?(/(?:property|name)="#{tag}" content="https?:\/\/[^"]+\/assets\/img\/me.jpg"/)
  end
end
raise "Missing profile photo" unless site.join("assets/img/me.jpg").file?
%w[wellness health-wellness-daily finance ai-tools].each do |section|
  raise "Removed section still published: #{section}" if site.join(section).exist?
end
Dir.glob(site.join("**/*.html")).each do |path|
  html = File.read(path)
  raise "Malformed image URL: #{path}" if html.match?(%r{/assets/https?://})
  raise "Old default thumbnail: #{path}" if html.include?("/assets/img/og/default-og.jpg")
end
puts "Sharing thumbnails, image URLs and removed sections: OK"
