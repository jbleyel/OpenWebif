// TODO minimize js

var isSecure = (window.location.protocol == 'https:');

var PlayerObj = function () {
	var self;
	var _hls = null;
	var _video = null;
	return {
		setup: function (auth, streamingport, live555HlsBase) {
			self = this;
			self.auth = auth;
			self.streamingport = streamingport;
			self.live555HlsBase = live555HlsBase || '';
			self.pl = GetLSValue('webtvplayerl', 'hls');
			self.pr = GetLSValue('webtvplayerr', 'hls');
			self.folderoptions = '';
			self.dn = '';

			_video = document.getElementById('hlsPlayer');

			$('#sbtn0').click(function () {
				$('#streambouquets_chosen').css('display', 'inline-block');
				$('#streamchannels_chosen').css('display', 'inline-block');
				$('#streamrecordings_chosen').css('display', 'none');
				$('#moviesort-button').hide();
				self.currentp = self.pl;
			});
			$('#sbtn1').click(function () {
				$('#streambouquets_chosen').css('display', 'none');
				$('#streamrecordings_chosen').css('display', 'inline-block');
				$('#streamchannels_chosen').css('display', 'none');
				$('#moviesort-button').show();
				self.currentp = self.pr;
			});

			$("#srcbuttons").buttonset();
			$("#streambouquets").chosen({disable_search_threshold: 5, no_results_text: "Oops, nothing found!", width: "200px"});
			$("#streambouquets").chosen().change(function () {
				self.loadBouquet($("#streambouquets").val());
			});
			$("#streamchannels").chosen({disable_search_threshold: 10, no_results_text: "Oops, nothing found!", width: "400px"});
			$("#streamchannels").chosen().change(function () {
				var sref = $("#streamchannels").val();
				var name = $("#streamchannels option:selected").text();
				var iptvurl = $("#streamchannels option:selected").attr('data-iptvurl') || '';
				if (iptvurl) {
					self.loadUrl(iptvurl, iptvurl.indexOf('.m3u8') !== -1);
				} else {
					self.setUrl(sref, name, true);
				}
				self.play();
			});

			$("#streamrecordings").chosen({disable_search_threshold: 10, no_results_text: "Oops, nothing found!", width: "400px"});
			$("#streamrecordings").chosen().change(function () {
				var ref = $("#streamrecordings").val();
				var name = $("#streamrecordings option:selected").text();
				if (ref !== '') {
					if (ref === name) {
						$("#streamrecordings").empty();
						$('#streamrecordings').trigger("chosen:updated");
						$("#moviesort-button .ui-selectmenu-text .sortimg").empty();
						self.getRecordings(ref, function () {
							$('#streamrecordings').trigger("chosen:updated");
						});
					} else {
						self.setUrl(ref, name);
						self.play();
					}
				}
			});

			$('.chosen-container .chosen-drop').addClass('ui-widget-content');
			if (theme === 'eggplant' || theme === 'vader') {
				$('.chosen-container .chosen-drop').css('background-image', 'none');
			}

			$('#btnstop').click(function () { self.stop(); $(this).blur(); });
			$('#btnplay').click(function () { self.play(); $(this).blur(); });

			$('#streamchannels_chosen').css('display', 'inline-block');
			$('#streamrecordings_chosen').css('display', 'none');

			if (self.live555HlsBase) {
				$('#wfollowlive').show();
				$('#wfollowlivel').show();
				$('#wfollowlive').prop('checked', GetLSValue('wfollowlive', false));
				$('#wfollowlive').click(function () {
					var on = $('#wfollowlive').is(':checked');
					SetLSValue('wfollowlive', on);
					$(this).blur();
					self.setFollowLive(on);
				});
				if (GetLSValue('wfollowlive', false)) {
					self.setFollowLive(true);
				}
			}

			$.widget("custom.iconselectmenu", $.ui.selectmenu, {
				_renderItem: function (ul, item) {
					var li = $("<li>"),
						wrapper = $("<div>", {text: item.label}).prepend(
							$("<span class='sortimg'>").append(
								$("<i>", {"class": "fa " + item.element.data("class")})
							)
						);
					return li.append(wrapper).appendTo(ul);
				}
			});

			var ms = GetLSValue('webtvms', 'name');
			$('#moviesort').val(ms).change();
			$('#moviesort').iconselectmenu({
				change: function (event, ui) {
					$("#streamrecordings").empty();
					SetLSValue('webtvms', ui.item.value);
					self.SortMovies();
				}
			}).addClass('ui-menu-icons');

			$('#moviesort-button').hide();
			$('#moviesort-button').css('margin-left', '10px');
			$('#wautoplay').checkboxradio();
			$('#wfollowlive').checkboxradio();
			$('#btnstop').button();
			$('#btnplay').button();
			$("#srcbuttons").buttonset();

			$('#wautoplay').click(function () {
				SetLSValue('wautoplay', $('#wautoplay').is(':checked'));
				$(this).blur();
			});
			$('#wautoplay').prop('checked', GetLSValue('wautoplay'));

			self.getRecordings('', function () {
				$('#streamrecordings').trigger("chosen:updated");
			});

			if (isSecure) {
				$('#srcbuttons').hide();
				$('#sbtn1').trigger("click");
			} else {
				self.loadBouquets();
			}

		}, setUrl: function (sref, name, live) {
			try {
				if (!live) {
					var fn = sref.split('/').reverse()[0];
					var path = encodeURIComponent(sref.substring(0, sref.length - fn.length));
					fn = fn.replace(/___/g, "'");
					var base = window.location.protocol + '//' + self.auth + window.location.hostname;
					if (window.location.port !== '')
						base += ':' + window.location.port;
					self.loadUrl(base + '/file?file=' + path + escape(fn), false);
				} else if (self.live555HlsBase) {
					self.loadUrl(self.live555HlsBase + '?ref=' + encodeURIComponent(sref), true);
				} else {
					self.loadUrl('http://' + self.auth + window.location.hostname + ':' + self.streamingport + '/' + sref, false);
				}
			} catch (e) { }

		}, loadUrl: function (url, isHls) {
			if (_hls) {
				_hls.destroy();
				_hls = null;
			}
			_video.pause();
			_video.removeAttribute('src');

			if (isHls) {
				if (_video.canPlayType('application/vnd.apple.mpegurl')) {
					_video.src = url;
				} else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
					_hls = new Hls();
					_hls.loadSource(url);
					_hls.attachMedia(_video);
				}
			} else {
				_video.src = url;
			}

		}, stop: function () {
			if (_hls) {
				_hls.stopLoad();
				_hls.destroy();
				_hls = null;
			}
			_video.pause();
			_video.removeAttribute('src');

		}, play: function () {
			if (_video) _video.play();

		}, SortMovies: function () {
			var idx = GetLSValue('webtvms', 'name');
			var _mv = MLHelper.SortMovies(idx).slice();
			var options = self.folderoptions;
			var items = [];
			for (var i = 0, len = _mv.length; i < len; i++) {
				items.push("<option value='" + _mv[i].fn + "'>" + _mv[i].title + "&nbsp;/&nbsp;" + _mv[i].bt + "</option>");
			}
			options += "<optgroup label='" + self.dn + "'>" + items.join("") + "</optgroup>";
			$("#streamrecordings").append(options);
			$('#streamrecordings').trigger("chosen:updated");

		}, setFollowLive: function (on) {
			if (on) {
				$('#streambouquets_chosen').css('display', 'none');
				$('#streamchannels_chosen').css('display', 'none');
				self.stop();
				self.loadUrl(self.live555HlsBase, true);
				if (GetLSValue('wautoplay', false)) self.play();
			} else {
				$('#streambouquets_chosen').css('display', 'inline-block');
				$('#streamchannels_chosen').css('display', 'inline-block');
				self.stop();
			}

		}, loadBouquets: function () {
			$.ajax({
				url: '/api/bouquets',
				dataType: 'json',
				cache: false,
				success: function (data) {
					var options = '';
					var lastBouquet = GetLSValue('webtvbouquet', '');
					$.each(data.bouquets, function (i, b) {
						var sref = b[0], name = b[1];
						var sel = (sref === lastBouquet) ? ' selected' : '';
						options += "<option value='" + sref + "'" + sel + ">" + name + "</option>";
					});
					$("#streambouquets").append(options);
					$('#streambouquets').trigger("chosen:updated");
					var sref = $("#streambouquets").val();
					if (sref) self.loadBouquet(sref);
				}
			});

		}, loadBouquet: function (sref) {
			SetLSValue('webtvbouquet', sref);
			$.ajax({
				url: '/api/servicelistplayable',
				dataType: 'json',
				cache: false,
				data: { sRef: sref, sRefPlaying: current_ref || '', includeName: 1 },
				success: function (data) {
					$("#streamchannels").empty();
					var options = "<option value=''></option>";
					$.each(data.services, function (i, s) {
						var disabled = s.isplayable ? '' : ' disabled';
						var iptvattr = s.iptvurl ? ' data-iptvurl="' + s.iptvurl.replace(/"/g, '&quot;') + '"' : '';
						options += "<option value='" + s.servicereference + "'" + disabled + iptvattr + ">" + s.servicename + "</option>";
					});
					$("#streamchannels").append(options);
					if (current_ref) $("#streamchannels").val(current_ref);
					$('#streamchannels').trigger("chosen:updated");
					if (current_ref && $("#streamchannels").val() === current_ref) {
						var iptvurl = $("#streamchannels option:selected").attr('data-iptvurl') || '';
						if (iptvurl) {
							self.loadUrl(iptvurl, iptvurl.indexOf('.m3u8') !== -1);
						} else {
							self.setUrl(current_ref, current_name, true);
						}
						if (GetLSValue('wautoplay')) self.play();
					}
				}
			});

		}, getRecordings: function (_dirname, callback) {
			var rdata = {fields: 'f'};
			if (_dirname !== '')
				rdata = {dirname: _dirname, fields: 'f'};
			$.ajax({
				url: '/api/movielist',
				dataType: 'json',
				cache: false,
				data: rdata,
				success: function (data) {
					var mv = data['movies'];
					self.dn = data['directory'];
					var subdirs = data['bookmarks'];
					var lastdir = '';
					var dira = self.dn.split('/');
					var options = '';
					if (dira.length > 1) {
						for (var i = 0; i < dira.length - 2; i++) {
							lastdir += dira[i] + '/';
						}
					}
					if (lastdir !== '') {
						options = "<optgroup label='Folders'>";
						options += "<option value='' disabled selected style='display:none;'></option>";
						options += "<option value='" + lastdir + "'>" + lastdir + "</option>";
						for (var j = 0; j < subdirs.length; j++) {
							options += "<option value='" + self.dn + subdirs[j] + "'>" + self.dn + subdirs[j] + "</option>";
						}
						options += "</optgroup>";
					}
					self.folderoptions = options;
					var _mv = [];
					$.each(mv, function (key, val) {
						var _fn = val['filename'].replace(/'/g, '___');
						_mv.push({title: val['eventname'], bt: val['begintime'], start: val['recordingtime'], fn: _fn});
					});
					MLHelper.SetMovies(_mv);
					self.SortMovies();
					callback();
				}
			});
		}
	}
};
