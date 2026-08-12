import 'dart:ui';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'alert_modal.dart';

class PostTaskModal extends StatefulWidget {
  final Map<String, dynamic> currentUser;
  final VoidCallback onTaskPosted;
  final VoidCallback onAddFunds;

  const PostTaskModal({
    super.key,
    required this.currentUser,
    required this.onTaskPosted,
    required this.onAddFunds,
  });

  @override
  State<PostTaskModal> createState() => _PostTaskModalState();
}

class _PostTaskModalState extends State<PostTaskModal> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _payCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  final _destLocCtrl = TextEditingController(); // For Delivery Tasks

  XFile? _pickedFile;
  Uint8List? _fileBytes;
  bool _isUploading = false;
  String _errorText = '';
  
  LatLng _selectedLocation = const LatLng(12.9692, 79.1559);
  LatLng _selectedDestination = const LatLng(12.9719, 79.1588);
  final MapController _mapController = MapController();

  String _taskType = 'physical'; // 'physical', 'delivery', 'digital'
  bool _placingDestination = false;
  bool _isSearchingLoc = false;
  bool _isSearchingDest = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _payCtrl.dispose();
    _locCtrl.dispose();
    _destLocCtrl.dispose();
    super.dispose();
  }

  Future<void> _searchLocation(String query, bool isDestination) async {
    if (query.trim().isEmpty) return;
    
    if (isDestination) {
      setState(() => _isSearchingDest = true);
    } else {
      setState(() => _isSearchingLoc = true);
    }

    try {
      final url = Uri.parse('https://nominatim.openstreetmap.org/search?format=json&q=${Uri.encodeComponent(query)}&limit=1');
      final response = await http.get(url, headers: {'User-Agent': 'QuickAid_Flutter_App'});
      
      if (response.statusCode == 200) {
        final List data = json.decode(response.body);
        if (data.isNotEmpty) {
          final lat = double.parse(data[0]['lat']);
          final lon = double.parse(data[0]['lon']);
          final point = LatLng(lat, lon);
          
          setState(() {
            if (isDestination) {
              _selectedDestination = point;
              _placingDestination = true;
            } else {
              _selectedLocation = point;
              _placingDestination = false;
            }
            _mapController.move(point, 15.0);
            _calculateDeliveryFare();
          });
        }
      }
    } catch (e) {
      // Ignore errors for search
    } finally {
      if (isDestination) {
        setState(() => _isSearchingDest = false);
      } else {
        setState(() => _isSearchingLoc = false);
      }
    }
  }

  Future<void> _reverseGeocode(LatLng point, bool isDestination) async {
    try {
      final url = Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.latitude}&lon=${point.longitude}');
      final response = await http.get(url, headers: {'User-Agent': 'QuickAid_Flutter_App'});
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final address = data['display_name'] ?? '';
        final shortAddress = address.split(',').take(2).join(',');
        
        setState(() {
          if (isDestination) {
            if (_destLocCtrl.text.isEmpty) _destLocCtrl.text = shortAddress;
          } else {
            if (_locCtrl.text.isEmpty) _locCtrl.text = shortAddress;
          }
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  void _calculateDeliveryFare() {
    if (_taskType == 'delivery') {
      final distMeters = const Distance().distance(_selectedLocation, _selectedDestination);
      final distKm = distMeters / 1000.0;
      final fare = 25 + (distKm * 12);
      _payCtrl.text = (fare < 30 ? 30 : fare).round().toString();
    }
  }

  Future<void> _submitTask() async {
    if (_titleCtrl.text.trim().isEmpty) {
      setState(() => _errorText = 'Task Title is required');
      return;
    }
    final payAmount = double.tryParse(_payCtrl.text) ?? 0.0;
    if (payAmount < 50) {
      setState(() => _errorText = 'Minimum pay is ₹50');
      return;
    }
    final currentBalance = double.tryParse(widget.currentUser['wallet_balance']?.toString() ?? '0') ?? 0.0;
    if (currentBalance < payAmount) {
      Navigator.pop(context);
      AlertModal.show(
        context,
        title: 'Insufficient Funds',
        message: 'Your wallet balance (₹$currentBalance) is less than the task pay amount (₹$payAmount). Please add funds to your wallet.',
        type: AlertType.error,
        primaryButtonText: 'Add Funds',
        onPrimaryPressed: () {
          Navigator.pop(context);
          widget.onAddFunds();
        },
        secondaryButtonText: 'Cancel',
      );
      return;
    }
    
    setState(() { _isUploading = true; _errorText = ''; });
    String finalDesc = _descCtrl.text.isEmpty ? 'Needs help ASAP' : _descCtrl.text;
    
    try {
      if (_fileBytes != null) {
        final fileName = '${DateTime.now().millisecondsSinceEpoch}_${_pickedFile!.name}';
        await Supabase.instance.client.storage.from('task_images').uploadBinary(fileName, _fileBytes!);
        final imageUrl = Supabase.instance.client.storage.from('task_images').getPublicUrl(fileName);
        finalDesc += '\n\n[IMAGE:$imageUrl]';
      }

      Map<String, dynamic> taskData = {
        'title': _titleCtrl.text,
        'description': finalDesc,
        'pay': payAmount,
        'category': _taskType,
        'task_type': _taskType,
        'seeker_id': widget.currentUser['id'],
        'status': 'open',
        'location': _taskType != 'digital' ? _locCtrl.text.isEmpty ? 'Specified on Map' : _locCtrl.text : 'Remote / Online',
      };

      if (_taskType != 'digital') {
        taskData['latitude'] = _selectedLocation.latitude;
        taskData['longitude'] = _selectedLocation.longitude;
      }

      if (_taskType == 'delivery') {
        taskData['destination_name'] = _destLocCtrl.text.isEmpty ? 'Specified on Map' : _destLocCtrl.text;
        taskData['dest_latitude'] = _selectedDestination.latitude;
        taskData['dest_longitude'] = _selectedDestination.longitude;
      }

      await Supabase.instance.client.from('tasks').insert(taskData);
      
      if (mounted) {
        Navigator.pop(context);
        widget.onTaskPosted();
      }
    } catch (e) {
      setState(() { _errorText = 'Failed to post task. Please try again.'; _isUploading = false; });
    }
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool readOnly = false,
    TextInputType? keyboardType,
    String? hint,
    Widget? suffixIcon,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!),
      ),
      child: TextField(
        controller: controller,
        readOnly: readOnly,
        keyboardType: keyboardType,
        style: TextStyle(fontSize: 14, color: isDark ? Colors.white : Colors.black87),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(icon, size: 20, color: Colors.blue),
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(maxWidth: 500, maxHeight: 750),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0F172A).withValues(alpha: 0.95) : Colors.white.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: isDark ? Colors.white12 : Colors.white, width: 1.5),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 30, offset: const Offset(0, 15)),
            ],
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: isDark ? Colors.white12 : Colors.black12)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Post New Task', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),

              // Body
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Type Selector
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.black26 : Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            _buildTypeChip('Physical', 'physical', Icons.handyman),
                            _buildTypeChip('Delivery', 'delivery', Icons.local_shipping),
                            _buildTypeChip('Digital', 'digital', Icons.computer),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      _buildTextField(controller: _titleCtrl, label: 'Task Title', icon: Icons.title, hint: 'e.g. Help me move a sofa'),
                      const SizedBox(height: 12),
                      _buildTextField(controller: _descCtrl, label: 'Description (Optional)', icon: Icons.description, hint: 'More details...'),
                      const SizedBox(height: 12),
                      
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildTextField(
                            controller: _payCtrl,
                            label: _taskType == 'delivery' ? 'Auto-Calculated Pay (₹)' : 'Pay (₹) - Min ₹50',
                            icon: Icons.currency_rupee,
                            keyboardType: TextInputType.number,
                            readOnly: _taskType == 'delivery',
                            hint: _taskType == 'delivery' ? 'Set pins on map to calculate' : 'e.g. 150',
                          ),
                          ValueListenableBuilder<TextEditingValue>(
                            valueListenable: _payCtrl,
                            builder: (context, value, child) {
                              final pay = double.tryParse(value.text) ?? 0.0;
                              if (pay > 0) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 6.0, left: 4.0),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.check_circle, size: 12, color: Colors.green),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Helper receives ₹${(pay * 0.95).round()} (5% Platform Fee)',
                                        style: const TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.w500),
                                      ),
                                    ],
                                  ),
                                );
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Location Section
                      if (_taskType != 'digital') ...[
                        const Text('Location Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        _buildTextField(
                          controller: _locCtrl,
                          label: _taskType == 'delivery' ? 'Pickup Location' : 'Task Location',
                          icon: Icons.location_on,
                          suffixIcon: IconButton(
                            icon: _isSearchingLoc ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.search, color: Colors.blue),
                            onPressed: () => _searchLocation(_locCtrl.text, false),
                          ),
                        ),
                        
                        if (_taskType == 'delivery') ...[
                          const SizedBox(height: 12),
                          _buildTextField(
                            controller: _destLocCtrl,
                            label: 'Dropoff / Destination',
                            icon: Icons.flag,
                            suffixIcon: IconButton(
                              icon: _isSearchingDest ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.search, color: Colors.red),
                              onPressed: () => _searchLocation(_destLocCtrl.text, true),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: () => setState(() => _placingDestination = false),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: !_placingDestination ? Colors.blue.withValues(alpha: 0.1) : Colors.transparent,
                                      border: Border.all(color: !_placingDestination ? Colors.blue : Colors.transparent),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.location_on, size: 16, color: !_placingDestination ? Colors.blue : Colors.grey),
                                        const SizedBox(width: 6),
                                        Text('Set Pickup', style: TextStyle(color: !_placingDestination ? Colors.blue : Colors.grey, fontWeight: FontWeight.bold, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: InkWell(
                                  onTap: () => setState(() => _placingDestination = true),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: _placingDestination ? Colors.red.withValues(alpha: 0.1) : Colors.transparent,
                                      border: Border.all(color: _placingDestination ? Colors.red : Colors.transparent),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.flag, size: 16, color: _placingDestination ? Colors.red : Colors.grey),
                                        const SizedBox(width: 6),
                                        Text('Set Dropoff', style: TextStyle(color: _placingDestination ? Colors.red : Colors.grey, fontWeight: FontWeight.bold, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                        
                        const SizedBox(height: 12),
                        Container(
                          height: 160,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!, width: 2),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: FlutterMap(
                              mapController: _mapController,
                              options: MapOptions(
                                initialCenter: _selectedLocation,
                                initialZoom: 15.0,
                                onTap: (tapPosition, point) {
                                  setState(() {
                                    if (_taskType == 'delivery' && _placingDestination) {
                                      _selectedDestination = point;
                                      _reverseGeocode(point, true);
                                    } else {
                                      _selectedLocation = point;
                                      _reverseGeocode(point, false);
                                    }
                                    _calculateDeliveryFare();
                                  });
                                },
                              ),
                              children: [
                                TileLayer(
                                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                  userAgentPackageName: 'com.quickaid.app',
                                ),
                                MarkerLayer(
                                  markers: [
                                    Marker(
                                      point: _selectedLocation,
                                      width: 40,
                                      height: 40,
                                      child: const Icon(Icons.location_on, color: Colors.blue, size: 40),
                                    ),
                                    if (_taskType == 'delivery')
                                      Marker(
                                        point: _selectedDestination,
                                        width: 40,
                                        height: 40,
                                        child: const Icon(Icons.location_on, color: Colors.red, size: 40),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.only(top: 8, bottom: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.touch_app, size: 14, color: Colors.grey),
                              SizedBox(width: 4),
                              Text('Tap map to manually drop pin', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                        ),
                      ] else ...[
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.blue.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.blue.withValues(alpha: 0.1)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.public, size: 32, color: Colors.blue),
                              SizedBox(height: 8),
                              Text('Remote / Digital Task', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                              SizedBox(height: 4),
                              Text('No physical location required. Helpers can complete this from anywhere.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.blueGrey)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // Image Picker
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          side: BorderSide(color: _pickedFile == null ? (isDark ? Colors.white24 : Colors.black26) : Colors.green),
                        ),
                        icon: Icon(
                          _pickedFile == null ? Icons.camera_alt_outlined : Icons.check_circle, 
                          color: _pickedFile == null ? null : Colors.green
                        ),
                        label: Text(
                          _pickedFile == null ? 'Attach Photo (Optional)' : 'Photo Attached',
                          style: TextStyle(color: _pickedFile == null ? null : Colors.green),
                        ),
                        onPressed: () async {
                          final picker = ImagePicker();
                          final xfile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
                          if (xfile != null) {
                            final bytes = await xfile.readAsBytes();
                            setState(() {
                              _pickedFile = xfile;
                              _fileBytes = bytes;
                            });
                          }
                        },
                      ),
                      
                      if (_errorText.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, color: Colors.red, size: 16),
                              const SizedBox(width: 8),
                              Expanded(child: Text(_errorText, style: const TextStyle(color: Colors.red, fontSize: 12))),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Footer
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: isDark ? Colors.white12 : Colors.black12)),
                ),
                child: SafeArea(
                  child: Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: _isUploading ? null : () => Navigator.pop(context),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Cancel', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 2,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF2563EB)]),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(color: const Color(0xFF3B82F6).withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4)),
                            ],
                          ),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _isUploading ? null : _submitTask,
                            child: _isUploading
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('Post Task', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeChip(String label, String value, IconData icon) {
    final isSelected = _taskType == value;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _taskType = value;
            _calculateDeliveryFare();
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))]
                : [],
          ),
          child: Column(
            children: [
              Icon(icon, size: 18, color: isSelected ? Colors.blue : Colors.grey),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? Colors.blue : Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
